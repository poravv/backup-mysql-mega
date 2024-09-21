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
    const cmd = `docker exec -i ${process.env.MYSQL_CONTAINER} /usr/bin/mysqldump -u${process.env.MYSQL_USER} -p${process.env.MYSQL_PASSWORD} ${process.env.MYSQL_DATABASE} > /tmp/backup.sql`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error al hacer el backup: ${error.message}`);
      return;
    }
    console.log("Backup realizado exitosamente.");
    uploadToMega();  // Llamar para subir a Mega
  });
};

// Función para subir el backup a Mega
const uploadToMega = () => {
  const storage = new mega.Storage({
    email: email,
    password: password,
  });

  storage.on('ready', () => {
    storage.upload('backup.sql', fs.createReadStream('./backup.sql'))
      .complete((file) => {
        console.log('Backup subido a Mega:', file.name);
        // Eliminar el archivo de backup local si ya no es necesario
        fs.unlinkSync('./backup.sql');
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
