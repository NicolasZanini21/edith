# Spec — Finanzas personales

## Por qué
Nico quiere poder registrar gastos e ingresos hablándole a Edith en lenguaje natural ("gasté 15.000 en el supermercado"), que ella los categorice sola, armar un presupuesto mensual de referencia repartido por categoría, y poder pedirle un resumen visual (gráfico) de en qué se fue la plata, todo sin agregar una pantalla nueva a la app: el gráfico se muestra como una imagen dentro del mismo chat, igual que hoy se escucha el audio de la respuesta.

## Historias de usuario
1. Como Nico, le digo a Edith "gasté 15.000 pesos en supermercado" y lo registra solo, asignándole una categoría ("Supermercado") sin que yo tenga que definirla de antemano.
2. Como Nico, si le digo "cobré 200.000 de un laburo freelance", lo registra como ingreso, separado de los gastos.
3. Como Nico, puedo decirle "categorizalo como Mascotas" o simplemente nombrar una categoría nueva al registrar un gasto, y esa categoría queda disponible para usarse de nuevo, sin que exista una lista fija predefinida.
4. Como Nico, le digo "quiero armar mi presupuesto mensual" y Edith me pregunta primero el monto total de referencia, y después cómo lo quiero repartir entre categorías, en vez de pedirme todo junto en un solo mensaje.
5. Como Nico, le pregunto "¿cómo voy con el presupuesto?" o "¿me estoy pasando en algo?" y me cuenta en texto si superé algún límite, por categoría o en el total.
6. Como Nico, le pido "mostrame un gráfico de mis gastos del mes" y Edith genera una imagen (un gráfico de torta o de barras por categoría) y la muestra directamente en el chat, sin que yo tenga que ir a ningún lado nuevo de la app.

## Criterios de aceptación (EARS)
- CUANDO el usuario describe un gasto o ingreso en lenguaje natural con un monto, EL SISTEMA DEBE usar function calling para registrarlo, clasificándolo como gasto o ingreso, y para los gastos asignando una categoría (nueva o ya usada antes).
- EL SISTEMA DEBE aceptar cualquier nombre de categoría que el usuario use o pida, sin restringirse a una lista fija.
- CUANDO el usuario pide armar o modificar un presupuesto, Y todavía no dio el monto total de referencia, EL SISTEMA DEBE preguntárselo antes de continuar.
- CUANDO el usuario ya dio el monto total pero no cómo repartirlo por categoría, EL SISTEMA DEBE preguntarle cómo quiere dividirlo, y recién ahí guardar el presupuesto con esa información completa.
- CUANDO el usuario pregunta cómo viene con el presupuesto, EL SISTEMA DEBE comparar lo gastado en el mes actual (por categoría y en total) contra el presupuesto guardado, y avisar si se superó algún límite.
- CUANDO el usuario pide un gráfico de sus gastos, EL SISTEMA DEBE generar una imagen con la distribución por categoría del mes correspondiente (el actual si no especifica otro) y mostrarla dentro de la conversación del chat, sin agregar ninguna pantalla o vista nueva a la aplicación.
- Esta función SÍ está disponible en el modo demo público (`EDITH_DEMO=true`), a diferencia de Spotify/Netflix/Excel: cada visitante recibe un id de sesión propio (guardado en el navegador) y todas las consultas y el gráfico quedan filtrados por ese id, así que nadie ve ni mezcla los gastos de otro visitante ni los datos personales de Nico (que siempre usa su propio id fijo, sin importar la sesión del navegador).

## Fuera de alcance
- Editar o borrar movimientos ya cargados (por ahora solo se agregan).
- Presupuestos de meses anteriores o futuros: siempre se trabaja sobre el mes en curso.
- Exportar los datos financieros a Excel (podría ser una mejora futura, reusando lo que ya existe para otros Excels).
- Multi-moneda: todo se asume en pesos argentinos.
