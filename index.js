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
const backupDB = async () => {
    const cmd = `docker exec -i ${process.env.MYSQL_CONTAINER} /usr/bin/mysqldump -u${process.env.MYSQL_USER} -p${process.env.MYSQL_PASSWORD} ${process.env.MYSQL_DATABASE} > backup.sql`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al hacer el backup: ${error.message}`);
            return;
        }

        // Verificar el tamaño del archivo antes de subirlo
        const stats = fs.statSync('backup.sql');
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        if (fileSizeInMB > 40) { // Si el archivo es mayor a 40 MB
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
    try {
        const storage = await new Promise((resolve, reject) => {
            const storageInstance = mega({
                email: email,
                password: password,
                autologin: true
            });

            storageInstance.on('ready', () => resolve(storageInstance));
            storageInstance.on('error', (error) => reject(error));
        });

        const backupFilePath = path.join(__dirname, 'backup.sql');
        const stats = fs.statSync(backupFilePath);
        const fileSize = stats.size;

        console.log('Inicio de subida a Mega');
        console.log('backupFilePath:', backupFilePath);
        console.log('fileSize:', fileSize);

        const uploadStream = storage.upload({ name: 'backup.sql', size: fileSize });

        fs.createReadStream(backupFilePath)
            .pipe(uploadStream)
            .on('complete', (file) => {
                console.log('Backup subido a Mega:', file.name);
                fs.unlinkSync(backupFilePath); // Eliminar archivo local
            })
            .on('error', (error) => {
                console.error('Error en la subida:', error);
            });

    } catch (error) {
        console.error('Error al conectar a Mega:', error);
    }
};

// Programar el backup para que se ejecute diariamente a medianoche
cron.schedule('0 0 * * *', () => {
    console.log('Iniciando el backup...');
    backupDB();
});

// Ejecutar la función una vez al iniciar la aplicación
backupDB();
