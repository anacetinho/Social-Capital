-- Auto-update last_contact_date trigger
-- Automatically updates people.last_contact_date when events with that person occur

CREATE OR REPLACE FUNCTION update_last_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_contact_date for all people who participated in this event
  UPDATE people
  SET last_contact_date = (
    SELECT MAX(e.date)
    FROM events e
    JOIN event_participants ep ON ep.event_id = e.id
    WHERE ep.person_id = people.id
  )
  WHERE id IN (
    SELECT person_id
    FROM event_participants
    WHERE event_id = NEW.event_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on event_participants table
CREATE TRIGGER trigger_update_last_contact
AFTER INSERT OR UPDATE ON event_participants
FOR EACH ROW
EXECUTE FUNCTION update_last_contact();

-- Also update when event date changes
CREATE OR REPLACE FUNCTION update_last_contact_on_event_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_contact_date for all people who participated in this event
  UPDATE people
  SET last_contact_date = (
    SELECT MAX(e.date)
    FROM events e
    JOIN event_participants ep ON ep.event_id = e.id
    WHERE ep.person_id = people.id
  )
  WHERE id IN (
    SELECT person_id
    FROM event_participants
    WHERE event_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_contact_on_event
AFTER UPDATE OF date ON events
FOR EACH ROW
EXECUTE FUNCTION update_last_contact_on_event_change();
