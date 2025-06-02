#!/bin/bash
set -e

echo "Starting Theater Equipment Catalog Application..."

# Function to wait for MySQL to be ready
wait_for_mysql() {
    echo "Waiting for MySQL to be ready..."
    local retries=30
    while [ $retries -gt 0 ]; do
        if mysqladmin ping -h localhost --silent 2>/dev/null; then
            echo "MySQL is ready!"
            return 0
        fi
        echo "MySQL is not ready yet. Waiting... ($retries retries left)"
        sleep 2
        retries=$((retries - 1))
    done
    echo "MySQL failed to start after 60 seconds"
    return 1
}

# Function to initialize database
init_database() {
    echo "Initializing database..."

    # Start MySQL service temporarily for initialization
    service mysql start

    # Wait for MySQL to be ready
    if ! wait_for_mysql; then
        echo "Failed to start MySQL for initialization"
        exit 1
    fi

    # Create database and user if they don't exist
    mysql -e "CREATE DATABASE IF NOT EXISTS theater_db;"
    mysql -e "CREATE USER IF NOT EXISTS 'theater_user'@'localhost' IDENTIFIED BY 'theater_password';"
    mysql -e "GRANT ALL PRIVILEGES ON theater_db.* TO 'theater_user'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"

    # Stop MySQL so supervisor can manage it
    service mysql stop

    echo "Database initialized successfully!"
}

# Function to setup application data
setup_application() {
    echo "Setting up application..."

    # Start MySQL temporarily for setup
    service mysql start
    wait_for_mysql

    cd /app/server

    # Run the application briefly to trigger migrations and setup
    echo "Running initial application setup..."
    timeout 30s node index.js || true

    # Stop MySQL so supervisor can manage it
    service mysql stop

    echo "Application setup completed!"
}

# Main execution
echo "=== Theater Equipment Catalog - Single Container Deployment ==="

# Initialize database
init_database

# Setup application (migrations, default data)
setup_application

# Start supervisor to manage all services
echo "Starting all services with supervisor..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
