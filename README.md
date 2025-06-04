# Theater Equipment Catalog Management System

A modern, full-stack application for managing theater audio and video equipment with a React frontend, Node.js/Express backend, and MySQL database. Optimized for deployment on Sevalla platform with enhanced performance and user experience.

## ✨ Key Features

### 🔐 Authentication & Security
- JWT-based user authentication
- Role-based access control (admin/manager/user)
- Secure API endpoints with middleware protection
- User impersonation for admin troubleshooting

### 📊 Equipment Management
- Complete CRUD operations for equipment
- Advanced search with real-time filtering
- Simplified Dashboard with clean interface
- Equipment details with comprehensive information
- Status tracking (Available, In Use, Maintenance)

### 🔍 Enhanced Search Experience
- **Simplified Search Interface** - Clean, intuitive design
- **Real-time Search** - Instant results as you type (300ms debounce)
- **Clickable Results** - Click any equipment row to view details
- **Smart Filtering** - Search across brand, model, serial number
- **Infinite Scroll** - Seamless loading of more results

### 📁 File Management
- Multi-file uploads (images, audio, PDFs)
- Secure file storage with access control
- File gallery with preview capabilities
- Drag-and-drop file upload interface

### 📈 Data Management
- Bulk import/export (CSV, XLSX, JSON)
- Equipment categories and types management
- Location management system
- Equipment logs and history tracking

### 🎨 Modern UI/UX
- Responsive design with Tailwind CSS
- Modern card-based layouts
- Clean, professional interface
- Mobile-optimized experience
- Toast notifications for user feedback

## Tech Stack

- **Frontend**: React, React Router, React Query, Tailwind CSS
- **Backend**: Node.js, Express.js, Sequelize ORM
- **Database**: MySQL
- **File Storage**: Local storage with Multer
- **Authentication**: JWT
- **Containerization**: Docker

## Project Structure

```
/project
  /client                 # React frontend
    /src
      /components         # Reusable UI components
      /pages              # Page components
      /context            # React context providers
      /services           # API service functions
  /server                 # Express backend
    /models               # Sequelize models
    /routes               # API routes
    /middleware           # Express middleware
    /config               # Configuration files
    /uploads              # File storage directory
  /Dockerfile             # Docker configuration
  /docker-compose.yml     # Docker Compose configuration
  /.env                   # Environment variables
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js and npm (for local development without Docker)

### Running with Docker

1. Clone the repository:
   ```
   git clone <repository-url>
   cd theater
   ```

2. Build and start the Docker container:
   ```
   docker-compose up -d --build
   ```

   **IMPORTANT**: To rebuild the containers without losing data:
   ```
   # Stop the containers
   docker-compose stop

   # Rebuild the app container only
   docker-compose build app

   # Start the containers again
   docker-compose up -d
   ```

   **WARNING**: Do not use `docker-compose down -v` as it will remove the volumes and all data. Instead, use:
   ```
   # To stop and remove containers without removing volumes
   docker-compose down

   # To rebuild and start
   docker-compose up -d --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Running Locally (Without Docker)

1. Clone the repository:
   ```
   git clone <repository-url>
   cd theater
   ```

2. Install backend dependencies:
   ```
   cd server
   npm install
   ```

3. Install frontend dependencies:
   ```
   cd ../client
   npm install
   ```

4. Set up MySQL database:
   - Create a database named `theater_db`
   - Update the `.env` file with your MySQL credentials

5. Start the backend server:
   ```
   cd ../server
   npm run dev
   ```

6. Start the frontend development server:
   ```
   cd ../client
   npm run dev
   ```

7. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## API Documentation

### Authentication

- `POST /api/auth/login`: Login with username and password
- `POST /api/auth/register`: Register a new user (admin only)
- `GET /api/auth/me`: Get current user information
- `POST /api/auth/impersonate/:userId`: Impersonate another user (admin only)
- `GET /api/auth/users`: Get list of all users (admin only)

### Equipment

- `GET /api/equipment`: Get all equipment with pagination and filters
- `GET /api/equipment/:id`: Get equipment by ID
- `POST /api/equipment`: Create new equipment with file uploads (admin/advanced only)
- `PUT /api/equipment/:id`: Update equipment with file uploads/deletions (admin/advanced only)
- `DELETE /api/equipment/:id`: Delete equipment (admin/advanced only)

### Import/Export

- `GET /api/import-export/export`: Export equipment data in CSV, XLSX, or JSON format (admin/advanced only)
- `POST /api/import-export/import`: Import equipment data from CSV, XLSX, or JSON files (admin/advanced only)

### Files

- `GET /api/files/:id`: Get file by ID
- `DELETE /api/files/:id`: Delete file (admin/advanced only)

### Saved Searches

- `GET /api/saved-searches`: Get all saved searches for the current user
- `POST /api/saved-searches`: Save a new search configuration
- `DELETE /api/saved-searches/:id`: Delete a saved search

## Role-Based Access Control

The system implements three user roles with different permissions:

### Admin
- Full access to all features
- Can create, read, update, and delete all equipment and files
- Can register new users
- Can impersonate other users
- Has access to phpMyAdmin for database management

### Advanced User
- Can create, read, update, and delete all equipment and files
- Cannot register new users or impersonate other users
- No access to phpMyAdmin

### Basic User
- Can view equipment list and details
- Can search and filter equipment
- Cannot create, update, or delete equipment or files

## Default Credentials

- Admin User:
  - Username: `admin`
  - Password: `admin123`

## Database Management

You can access phpMyAdmin at http://localhost:8080 and log in with the following credentials:

- Server: `db` (this is the hostname of the MySQL container)
- Username: `root`
- Password: `secret`

## Advanced Dashboard

The Advanced Dashboard provides a sophisticated search interface for finding equipment:

### Features

- **Unified Search Bar**: Search across brand, model, serial number, and description fields
- **Real-time Suggestions**: Get instant suggestions as you type
- **Advanced Filters**: Filter by type, status, location, and date range
- **Saved Searches**: Save your frequently used search configurations (admin/advanced users only)
- **Responsive Grid**: View equipment in a modern card-based layout
- **Infinite Scroll**: Seamlessly load more results as you scroll
- **Highlighted Results**: Search terms are highlighted in the results
- **Quick Preview**: Hover over equipment cards to see more details
- **Sort Options**: Sort by various fields in ascending or descending order

## Bulk Import/Export

The system supports bulk import and export of equipment data in CSV, XLSX, and JSON formats.

### Export

1. Navigate to the Equipment List page
2. Click the "Import/Export" button
3. Select the desired export format (CSV, XLSX, or JSON)
4. Click "Export"

### Import

1. Navigate to the Equipment List page
2. Click the "Import/Export" button
3. Switch to the "Import" tab
4. Drag and drop a file or click to select a file (CSV, XLSX, or JSON)
5. Choose whether to update existing equipment if found
6. Click "Import"

### Import File Format

The import file should contain the following columns:
- `Brand`: Equipment brand (required)
- `Model`: Equipment model (required)
- `Serial Number`: Equipment serial number (required)
- `Type`: Equipment type name
- `Status`: Equipment status (available, in-use, maintenance)
- `Location`: Location name
- `Description`: Equipment description

### Using the Advanced Dashboard

1. Navigate to "Advanced Search" in the sidebar
2. Use the search bar at the top to find equipment by keyword
3. Click "Show Filters" to access advanced filtering options
4. Apply filters to narrow down your search results
5. For admin/advanced users, save your searches by clicking "Save Current Search"
6. Click on equipment cards to view full details or edit (if you have permission)

## Dependencies

The Advanced Dashboard requires the following additional dependencies:

```
npm install react-toastify react-datepicker lodash
```

## User Impersonation (Admin Only)

As an admin user, you can impersonate other users to troubleshoot issues:

1. Log in as admin
2. Navigate to the Admin Dashboard
3. Find the user you want to impersonate in the user list
4. Click the "Impersonate" button
5. You will be logged in as that user with their permissions
6. To stop impersonating, click "End Impersonation" in the header

## License

This project is licensed under the MIT License.

docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose start
docker save -o theater-app-image.tar theater-app:latest

# theater-equipment-catalog-deploy
# theater-equipment-catalog-deploy
# theater-equipment-catalog-deploy
