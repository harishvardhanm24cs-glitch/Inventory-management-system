import db from '../backend/config/db.js';

async function checkTriggers() {
  try {
    const [triggers] = await db.query("SHOW TRIGGERS");
    console.log("--- DB Triggers ---");
    console.table(triggers.map(t => ({ Trigger: t.Trigger, Event: t.Event, Table: t.Table, Timing: t.Timing })));

    const [tables] = await db.query("SHOW TABLES");
    console.log("--- DB Tables ---");
    console.table(tables);

    db.end();
  } catch (err) {
    console.error(err);
    db.end();
  }
}

checkTriggers();
