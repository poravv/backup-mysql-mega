require('dotenv').config(); // Cargar variables de entorno

const { exec } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
const mega = require('megajs');
const fetch = require('node-fetch');

// Asignar fetch a globalThis
if (!globalThis.fetch) {
  globalThis.fetch = fetch; 
}

// Configuración de Mega
const email = process.env.MEGA_EMAIL;
const password = process.env.MEGA_PASSWORD;

// Función para realizar el backup
const backupDB = () => {
    const cmd = `docker exec -i ${process.env.MYSQL_CONTAINER} /usr/bin/mysqldump -u${process.env.MYSQL_USER} -p${process.env.MYSQL_PASSWORD} ${process.env.MYSQL_DATABASE} > .backup.sql`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al hacer el backup: ${error.message}`);
            return;
        }
        
        // Verificar el tamaño del archivo antes de subirlo
        const stats = fs.statSync('.backup.sql');
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        if (fileSizeInMB > 40) { // Si el archivo es mayor a 2 MB
            console.error('El archivo de backup excede el tamaño máximo permitido (40 MB).');
            return;
        }
        
        console.log("Backup realizado exitosamente.");
        uploadToMega();  // Llamar para subir a Mega
    });
};

// Función para subir el backup a Mega
const path = require('path');

const uploadToMega = async () => {

    const storage = await new mega.Storage({
        email: email,
        password: password,
        allowUploadBuffering: true, // Habilitar buffering
    }).ready

    storage.on('ready', async () => {
        const backupFilePath = path.join(__dirname, 'backup.sql'); // Ruta relativa al archivo
        const stats = fs.statSync(backupFilePath);
        const fileSize = stats.size;

        console.log('Inicio de subida a Mega');
        console.log('backupFilePath:', backupFilePath);
        console.log('fileSize:', fileSize);

        // Realizar la subida especificando el tamaño
        await storage.upload(backupFilePath, fs.createReadStream(backupFilePath), {
            size: fileSize // Especificar el tamaño del archivo aquí
        })
        .complete((file) => {
            console.log('Backup subido a Mega:', file.name);
            fs.unlinkSync(backupFilePath); // Eliminar archivo local si ya no es necesario
        })
        .fail((error) => {
            console.error('Error en la subida:', error); // Captura el error de subida
        });
    });
};


// Programar el backup para que se ejecute diariamente a medianoche
cron.schedule('0 0 * * *', () => {
    console.log('Iniciando el backup...');
    backupDB();
});

// Ejecutar la función una vez al iniciar la aplicación
backupDB();
