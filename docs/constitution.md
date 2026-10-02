# Constitución — Diario de Estudio  
Principios innegociables. Toda spec, plan y tarea debe cumplirlos.  
1. **Simplicidad primero**: HTML, CSS y JS puros, con Node.js 18+ nativo para el servidor. Sin dependencias ni build. El modo oficial es `node server.js` en `http://localhost:3000`.
2. **La spec manda**: nada se implementa si no está en la spec activa. Si falta una decisión, se para y se pregunta. 
3. **Lógica separada de interfaz**: los cálculos (fechas, rachas, estadísticas) son funciones puras, sin DOM, almacenamiento ni red,
que reciben "hoy" como parámetro. 
4. **Tests como puerta**: la lógica se prueba con `node --test`, sin instalar paquetes. Prohibido avanzar con tests en rojo. 
5. **Los datos del usuario son sagrados**: el documento JSON del proyecto (`data/data.json`) es la fuente de verdad y se conserva con validación y escritura segura. La migración única desde `localStorage` se realiza mediante un puente temporal, conserva las claves originales y, al completarse, la aplicación ya no usa `localStorage`. Las fechas siempre usan la hora local y nunca se pierde una sesión; `data/data.backup.json` es una copia de seguridad, no una fuente alternativa.
6. **Idioma**: código en inglés; interfaz y documentación en español. 
