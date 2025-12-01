# 빌드 단계
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# 실행 단계
FROM node:20-alpine

WORKDIR /app

# 보안 및 성능 개선을 위해 non-root 사용자 생성
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# 빌드 단계에서 node_modules 복사
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# 애플리케이션 코드 복사
COPY --chown=nodejs:nodejs . .

# nodejs 사용자로 전환
USER nodejs

EXPOSE 8080

# 헬스 체크 추가
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["npm", "start"]
