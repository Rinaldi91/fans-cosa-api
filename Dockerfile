# Gunakan image Node.js versi terbaru
FROM node:20-alpine

# Set working directory di dalam container
WORKDIR /app

# Copy file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy seluruh project ke dalam container
COPY . .

# Expose port aplikasi (sesuai dengan Express.js)
EXPOSE 5000

# Jalankan aplikasi
CMD ["node", "app.js"]
