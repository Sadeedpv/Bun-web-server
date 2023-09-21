import { Elysia, t } from "elysia";
import { Database } from "bun:sqlite";
import { cors } from "@elysiajs/cors";

const app = new Elysia();
app.use(cors());

// Error Handling
app.onError(({ code, error }) => {
  return new Response(error.toString(), {
    status:500 // Internal Server Error
  })
});

// DB Config
// Create DB If not Exists
const DB = new Database("mydb.sqlite", { create: true });

try {
  DB.query(
    `CREATE TABLE IF NOT EXISTS USERS(
      userId INTEGER PRIMARY KEY
      username VARCHAR(30) NOT NULL,
      password TEXT NOT NULL
    );`
  ).run();
  DB.query(
    `CREATE TABLE IF NOT EXISTS MESSAGES(
    id INTEGER,
    message TEXT NOT NULL,
    done BOOLEAN NOT NULL CHECK(done IN (0, 1)),
    FOREIGN KEY(id) REFERENCES USERS(userId)
  );`
  ).run();
} catch (err) {
  console.log("Error has occured: ", err);
  process.exit(1);
}

// Routes

app.get("/", (context) => {
  const query = DB.query(`SELECT * FROM MESSAGES;`);
  const result = query.all();
  console.log(result);
  context.set.status = 200;

  return new Response(JSON.stringify({ messages: result }), {
    headers: { "Content-Type": "application/json" },
  });
});

app.post(
  "/add",
  ({ body }) => {
    const message = body?.message;
    const done = body?.done;
    console.log(message);
    const query = DB.query(
      `INSERT INTO MESSAGES (message, done) VALUES (?1, ?2)`
    );
    query.run(message, done);
    return new Response(JSON.stringify({ message: "Data Added!" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
  {
    body: t.Object({
      message: t.String(),
      done: t.Integer(),
    }),
  }
);

app.put(
  "/update/:id",
  (context) => {
    const id = context.params.id;
    const message = context.body.message;
    const done = context.body.done;
    const query = DB.query("SELECT * FROM MESSAGES WHERE ID =?1;");
    if (query.all(id).length === 0) {
      context.set.status = 400;
      return new Response(
        JSON.stringify({ message: "Wrong parameter! Nothing to update here" }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    const updateQuery = DB.query(
      "UPDATE MESSAGES SET message=?1, done=?2 WHERE ID = ?3"
    );
    updateQuery.run(message, done, id);
    context.set.status = 200;
    let updatedData = query.get(id);
    return new Response(
      JSON.stringify({
        message: updatedData,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  },
  {
    body: t.Object({
      message: t.String(),
      done: t.Integer(),
    }),
  }
);

app.delete("/delete/:id", (context) => {
  const id = context.params.id;
  const query = DB.query("SELECT * FROM MESSAGES WHERE ID=?1;");
  let deletedData = query.all(id)[0];
  if (query.all(id).length === 0) {
    context.set.status = 400;
    return new Response(
      JSON.stringify({ message: "Wrong parameter! Nothing to delete here" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  const deleteQuery = DB.query("DELETE FROM MESSAGES WHERE ID=?1");
  deleteQuery.run(id);
  return new Response(
    JSON.stringify({
      message: deletedData,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
});

app.delete("/delete", (context) => {
  const query = DB.query("SELECT * FROM MESSAGES;");
  if (query.all().length === 0) {
    context.set.status = 404;
    return new Response(
      JSON.stringify({ message: "Database is Empty! Nothing to delete" }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
  DB.exec("DELETE FROM MESSAGES;");
  return new Response(JSON.stringify({ message: "Database deleted!" }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
});

app.patch(
  "/patchdone/:id",
  (context) => {
    const id = context.params.id;
    const done = context.body.done;
    const query = DB.query("SELECT * FROM MESSAGES WHERE ID =?1;");
    if (query.all(id).length === 0) {
      context.set.status = 400;
      return new Response(
        JSON.stringify({
          message: "Wrong parameter! Nothing to update here",
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    const patchQuery = DB.query("UPDATE MESSAGES SET done=?1 WHERE ID=?2;");
    patchQuery.run(done, id);
    return new Response(JSON.stringify({ message: "Database updated!" }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  },
  {
    body: t.Object({
      done: t.Integer(),
    }),
  }
);

app.get("/hello/:name", ({ params: { name } }) => {
  return `Hello ${name}!`;
});

app.get("bye/:name", (context) => {
  context.set.status = 200;
  return `Hello ${context.params.name}`;
});

let PORT = Bun.env.PORT || 8000;
app.listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
