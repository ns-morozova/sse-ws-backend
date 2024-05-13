import http from "http";
import express from "express";
import WebSocket, { WebSocketServer } from "ws";
import cors from "cors";
import bodyParser from "body-parser";
import * as crypto from "crypto";

const app = express();

const chat = [];

app.use(cors());
app.use(
  bodyParser.json({
    type(req) {
      return true;
    },
  })
);
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

const userState = [];
app.post("/new-user", async (request, response) => {
  if (Object.keys(request.body).length === 0) {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.status(400).send(JSON.stringify(result)).end();
  }
  const { name } = request.body;
  const isExist = userState.find((user) => user.name === name);
  if (!isExist) {
    const newUser = {
      id: crypto.randomUUID(),
      name: name,
      //ws: ''
    };
    userState.push(newUser);
    const result = {
      status: "ok",
      user: newUser,
    };
    response.send(JSON.stringify(result)).end();
  } else {
    const result = {
      status: "error",
      message: "This name is already taken!",
    };
    response.status(409).send(JSON.stringify(result)).end();
  }
});

const server = http.createServer(app);
const wsServer = new WebSocketServer({ server });
wsServer.on("connection", (ws, req) => {

  /* получаем имя из параметров url */
  const { searchParams } = new URL(req.url, 'http://example.com'); // Второй параметр в данном случае не важен
  const username = searchParams.get('login');
  console.log(username);

  ws.on("message", (msg, isBinary) => {
    const receivedMSG = JSON.parse(msg);
    console.dir(receivedMSG);
    if (receivedMSG.type === "exit") {
      const idx = userState.findIndex(
        (user) => user.name === receivedMSG.user.name
      );
      userState.splice(idx, 1);
      [...wsServer.clients]
        .filter((o) => o.readyState === WebSocket.OPEN)
        .forEach((o) => o.send(JSON.stringify({ type: 'users', users: userState })));
      return;
    }
    if (receivedMSG.type === "send") {
      chat.push({ user: receivedMSG.user, message: receivedMSG.message, date: receivedMSG.date });
      [...wsServer.clients]
        .filter((o) => o.readyState === WebSocket.OPEN)
        .forEach((o) => o.send(msg, { binary: isBinary }));
    }
  });


  /* отправка пользователей всем присоединёным пользователям */
  [...wsServer.clients]
    .filter((o) => o.readyState === WebSocket.OPEN)
    .forEach((o) => o.send(JSON.stringify({ type: 'users', users: userState })));
  /* отправка сообщения с массивом сообщений из чата */
  ws.send(JSON.stringify({ type: 'chat', chat }));

});

const port = process.env.PORT || 3000;

const bootstrap = async () => {
  try {
    server.listen(port, () =>
      console.log(`Server has been started on http://localhost:${port}`)
    );
  } catch (error) {
    console.error(error);
  }
};

bootstrap();
