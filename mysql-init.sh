#!/bin/sh

# Start MySQL service
/usr/bin/mysqld_safe --datadir=/var/lib/mysql --bind-address=0.0.0.0 &

# Wait for MySQL to start
sleep 10

# Create database and user
mysql -u root -e "CREATE DATABASE IF NOT EXISTS theater_db;"
mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'secret';"
mysql -u root -e "CREATE USER IF NOT EXISTS 'root'@'%' IDENTIFIED BY 'secret';"
mysql -u root -e "GRANT ALL PRIVILEGES ON theater_db.* TO 'root'@'localhost';"
mysql -u root -e "GRANT ALL PRIVILEGES ON theater_db.* TO 'root'@'%';"
mysql -u root -e "FLUSH PRIVILEGES;"

# Keep MySQL running
tail -f /dev/null
