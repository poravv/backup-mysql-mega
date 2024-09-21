require('dotenv').config(); // Cargar variables de entorno

const { exec } = require('child_process');
const fs = require('fs');
const cron = require('node-cron');
const mega = require('megajs');
const fetch = require('node-fetch');
const path = require('path');

// Asignar fetch a globalThis
if (!globalThis.fetch) {
    globalThis.fetch = fetch; 
}

// Configuración de Mega
const email = process.env.MEGA_EMAIL;
const password = process.env.MEGA_PASSWORD;

// Función para generar un nombre de archivo único basado en la fecha y hora
const generateBackupFileName = () => {
    const date = new Date();
    const timestamp = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
    return `legajobk_${timestamp}.sql`; // Nombre de archivo con timestamp
};

// Función para realizar el backup
const backupDB = async () => {
    const backupFileName = generateBackupFileName();
    const backupFilePath = path.join(__dirname, backupFileName);
    
    const cmd = `docker exec -i ${process.env.MYSQL_CONTAINER} /usr/bin/mysqldump -u${process.env.MYSQL_USER} -p${process.env.MYSQL_PASSWORD} ${process.env.MYSQL_DATABASE} > ${backupFilePath}`;

    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al hacer el backup: ${error.message}`);
            return;
        }

        // Verificar el tamaño del archivo antes de subirlo
        const stats = fs.statSync(backupFilePath);
        const fileSizeInMB = stats.size / (1024 * 1024);
        
        if (fileSizeInMB > 40) { // Si el archivo es mayor a 40 MB
            console.error('El archivo de backup excede el tamaño máximo permitido (40 MB).');
            return;
        }
        
        console.log("Backup realizado exitosamente.");
        uploadToMega(backupFilePath, backupFileName);  // Llamar para subir a Mega
    });
};

// Función para subir el backup a Mega dentro de una carpeta y subcarpeta
const uploadToMega = async (backupFilePath, backupFileName) => {
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

        const stats = fs.statSync(backupFilePath);
        const fileSize = stats.size;

        console.log('Inicio de subida a Mega');
        console.log('backupFilePath:', backupFilePath);
        console.log('fileSize:', fileSize);

        // Verificar si el directorio 'BK' existe
        let directory = storage.root.children.find(child => child.name === 'BK');
        
        // Si no existe, creamos el directorio "BK"
        if (!directory) {
            console.log("Directorio 'BK' no existe, creando directorio...");
            directory = await storage.mkdir('BK');
        }

        // Verificar o crear la subcarpeta dentro de 'BK'
        const subFolderName = 'legajo';  // Cambia esto a tu nombre de subcarpeta
        let subDirectory = directory.children.find(child => child.name === subFolderName);
        if (!subDirectory) {
            console.log(`Subcarpeta '${subFolderName}' no existe, creando subcarpeta...`);
            subDirectory = await directory.mkdir(subFolderName);
        }

        // Subir el archivo dentro de la subcarpeta 'legajo'
        const uploadStream = subDirectory.upload({ name: backupFileName, size: fileSize });

        fs.createReadStream(backupFilePath)
            .pipe(uploadStream)
            .on('complete', (file) => {
                console.log(`Backup subido a Mega dentro de la subcarpeta '${subFolderName}':`, file.name);
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
