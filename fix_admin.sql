USE theater_db;

-- Update the admin user with the new password hash
UPDATE users SET password='$2b$10$FAXuGK9Wi6/h3dE1xJl45e1yhmWlffjTZAs1.z854SaPB4KuAjoWe' WHERE username='admin';

-- Remove the admin2 and admin3 users
DELETE FROM users WHERE username IN ('admin2', 'admin3');
