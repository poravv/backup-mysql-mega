# Usa la imagen oficial de Node.js
FROM node:14

# Instala Docker CLI
RUN apt-get update && apt-get install -y docker.io

# Crea un directorio para la aplicación
WORKDIR /usr/src/app

# Copia los archivos de package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Comando para ejecutar la aplicación
CMD ["node", "index.js"]
