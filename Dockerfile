# Usa la imagen oficial de Node.js
FROM node:14

# Crea un directorio para la aplicación
WORKDIR /usr/src/app

# Copia los archivos de package.json y package-lock.json
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Copia el resto de los archivos de la aplicación
COPY . .

# Expone el puerto si es necesario (no es necesario para este caso)
# EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["node", "index.js"]
