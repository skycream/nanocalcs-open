# nanocalcs-mcp: stdio MCP 서버 (Glama 등 디렉터리의 안전·품질 점검용)
FROM node:22-alpine
WORKDIR /app
RUN npm install -g nanocalcs-mcp@0.2.1 && npm cache clean --force
USER node
ENTRYPOINT ["nanocalcs-mcp"]
