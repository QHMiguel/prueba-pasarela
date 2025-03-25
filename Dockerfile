# production stage
FROM nginx:1.26.2-alpine
# FROM nginx:1.15.12-alpine

# Copia el archivo de configuración de nginx
ARG NGX_FILE=nginx.conf
ADD deployments/nginx/${NGX_FILE} /etc/nginx/conf.d/default.conf

# Copia los archivos construidos desde la etapa de construcción
COPY dist /usr/share/nginx/html/pasarela/

# Expone el puerto en el que nginx se ejecutará
EXPOSE 8080

# Comando para ejecutar nginx
CMD ["nginx", "-g", "daemon off;"]
