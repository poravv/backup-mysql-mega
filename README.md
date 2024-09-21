# Proyecto Node.js

Este proyecto es una aplicación Node.js que se ejecuta con `pm2` para el manejo de procesos. `pm2` permite mantener la aplicación corriendo y reiniciarla automáticamente en caso de fallos. También se configura para iniciarse automáticamente al reiniciar el servidor.

El objetivo principal del proyecto es realiazr backup de mysql dentro de un contenedor y enviarlo hacia el servidor de MEGA.

## Requisitos

- Node.js (v14+)
- pm2 (Instalar globalmente con: `npm install -g pm2`)

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/poravv/backup-mysql-mega.git

cd backup-mysql-mega
npm install
```
#### Crear .env

```
MYSQL_CONTAINER=mysql-container
MYSQL_USER=your_mysql_user
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=your_database_name

MEGA_EMAIL=your-mega-email@example.com
MEGA_PASSWORD=your-mega-password

```

2. Levantar PM2
```bash
sudo pm2 start index.js --name "backup"
```
3. Extras 
```bash
sudo pm2 status

sudo pm2 logs backup

sudo pm2 restart backup

sudo pm2 delete backup

```
4. Iniciar automaticamente PM2
```bash
pm2 startup

pm2 save
```