import { createMiddleware } from "langchain";

export const loggingMiddleware = createMiddleware({
  name: "LoggingMiddleware",
  wrapModelCall: (request, handler) => {
    console.log("Model call request:", {
      messages: request.messages.map((msg) => ({
        name: msg.name,
        type: msg.type,
        content:
          msg.content.length > 1000
            ? `${(msg.content as string).slice(0, 1000)}...`
            : msg.content,
      })),
    });
    return handler(request);
  },
});
