import { createMiddleware } from "langchain";

export const trimMessagesHistoryMiddleware = createMiddleware({
  name: "TrimMessageHistory",
  wrapModelCall: (request, handler) => {
    return handler({
      ...request,
      messages: request.messages.slice(-10),
    });
  },
});
