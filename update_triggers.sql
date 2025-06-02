-- Drop existing triggers
DROP TRIGGER IF EXISTS update_equipment_location_before_insert;
DROP TRIGGER IF EXISTS update_equipment_location_before_update;

-- Create new triggers
DELIMITER //

-- Trigger for INSERT operations
CREATE TRIGGER update_equipment_location_before_insert
BEFORE INSERT ON equipment
FOR EACH ROW
BEGIN
    -- Update location name if location_id is provided
    IF NEW.location_id IS NOT NULL THEN
        SELECT name INTO @location_name FROM locations WHERE id = NEW.location_id;
        IF @location_name IS NOT NULL THEN
            SET NEW.location = @location_name;
            
            -- Set status to 'in-use' if location is not 'Lager' and status is 'available'
            IF @location_name != 'Lager' AND (NEW.status = 'available' OR NEW.status IS NULL) THEN
                SET NEW.status = 'in-use';
            END IF;
        END IF;
    -- If custom location is provided (no location_id)
    ELSEIF NEW.location IS NOT NULL AND NEW.location != '' AND NEW.location != 'Lager' THEN
        -- Set status to 'in-use' if location is not 'Lager' and status is 'available'
        IF NEW.status = 'available' OR NEW.status IS NULL THEN
            SET NEW.status = 'in-use';
        END IF;
    END IF;
END //

-- Trigger for UPDATE operations
CREATE TRIGGER update_equipment_location_before_update
BEFORE UPDATE ON equipment
FOR EACH ROW
BEGIN
    -- Update location name if location_id is provided and changed
    IF NEW.location_id IS NOT NULL AND (OLD.location_id != NEW.location_id OR NEW.location IS NULL OR NEW.location = '') THEN
        SELECT name INTO @location_name FROM locations WHERE id = NEW.location_id;
        IF @location_name IS NOT NULL THEN
            SET NEW.location = @location_name;
            
            -- Set status to 'in-use' if location is not 'Lager' and status is 'available'
            IF @location_name != 'Lager' AND NEW.status = 'available' THEN
                SET NEW.status = 'in-use';
            END IF;
        END IF;
    -- If custom location is provided (no location_id) and it's not 'Lager'
    ELSEIF NEW.location IS NOT NULL AND NEW.location != '' AND NEW.location != 'Lager' AND 
           (OLD.location != NEW.location OR NEW.location_id IS NULL) THEN
        -- Set status to 'in-use' if status is 'available'
        IF NEW.status = 'available' THEN
            SET NEW.status = 'in-use';
        END IF;
    END IF;
END //

DELIMITER ;
