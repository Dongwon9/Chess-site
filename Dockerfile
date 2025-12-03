# 개발 환경용 Dockerfile
FROM node:24-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 파일 복사
COPY package*.json ./

# 의존성 설치 (devDependencies 포함)
RUN npm install

# 전체 소스 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 개발 서버 실행 (nodemon 사용)
CMD ["npm", "run", "start:dev"]
