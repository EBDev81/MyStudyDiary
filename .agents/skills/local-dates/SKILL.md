--- 
Name: local-dates 
description: Úsala siempre que escribas, modifiques o revises código que trabaje con fechas, días, semanas o rachas en el Diario de Estudio. 
--- 
# Fechas locales en el Diario de Estudio 
Las fechas son la mayor fuente de bugs de este proyecto. Sigue esta guía siempre que toques código con fechas. 

## Reglas 
- Las fechas se guardan como texto "AAAA-MM-DD" en la zona horaria local del usuario. 
- Para obtener el día de hoy, construye el texto con getFullYear(), getMonth() + 1 y getDate(), rellenando con ceros. 
- Para convertir "AAAA-MM-DD" en fecha, usa new Date(año, mes - 1, día). Nunca new Date("AAAA-MM-DD"): se interpreta en UTC. 
- Nunca uses toISOString() para obtener el día: devuelve la fecha en UTC. 
- Para sumar o restar días, usa setDate(getDate() ± n), nunca milisegundos (24 h no siempre es un día por los cambios de hora). 
- Reutiliza las funciones de fechas que ya existan en app.js antes de crear otras nuevas. 
 
## Checklist de revisión 
- [ ] ¿Algún toISOString() o new Date("AAAA-MM-DD")? 
- [ ] ¿Algún cálculo con 86400000 milisegundos? 
- [ ] ¿Qué pasa con una sesión registrada a las 00:30? 
- [ ] ¿Qué pasa el día del cambio de hora (último domingo de marzo y de octubre)? 
- [ ] ¿Se ignoran las fechas futuras donde corresponde?

## Al terminar 
Indica qué puntos de la checklist has comprobado y cómo. 