var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

// Cliente HTTP para reenviar pedidos al puente de Python.
// En local apunta a localhost; en producción, a la URL pública del
// servicio del puente (variable de entorno PUENTE_BASE_URL).
var puenteBaseUrl = builder.Configuration["PUENTE_BASE_URL"] ?? "http://127.0.0.1:5001";
builder.Services.AddHttpClient("puente", c =>
{
    c.BaseAddress = new Uri(puenteBaseUrl);
    c.Timeout = TimeSpan.FromMinutes(5);
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

//app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    // Forzar que el navegador siempre revalide (no confiar en el cacheo
    // heurístico por Last-Modified): sin esto, visitantes que ya habían
    // pasado por el sitio se quedan sirviendo script.js/estilos.css viejos
    // durante días aunque hagamos un deploy nuevo.
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache";
    }
});

// Rutas que resuelve el puente Flask
string[] rutasPuente = { "texto", "escuchar", "conversaciones", "conversacion", "guardar_conversacion", "salud", "grafico" };

app.Map("/{ruta:regex(^(texto|escuchar|conversaciones|conversacion|guardar_conversacion|salud|grafico)$)}/{**resto}", async (HttpContext ctx, IHttpClientFactory factory, string ruta, string? resto) =>
{
    var cliente = factory.CreateClient("puente");
    var destino = "/" + ruta + (string.IsNullOrEmpty(resto) ? "" : "/" + resto) + ctx.Request.QueryString;

    var pedido = new HttpRequestMessage(new HttpMethod(ctx.Request.Method), destino);

    if (ctx.Request.ContentLength > 0 || ctx.Request.Headers.ContainsKey("Transfer-Encoding"))
    {
        pedido.Content = new StreamContent(ctx.Request.Body);
        if (ctx.Request.ContentType is not null)
            pedido.Content.Headers.TryAddWithoutValidation("Content-Type", ctx.Request.ContentType);
    }

    using var respuesta = await cliente.SendAsync(pedido, HttpCompletionOption.ResponseHeadersRead);

    ctx.Response.StatusCode = (int)respuesta.StatusCode;

    // Reenviar TODOS los headers de la respuesta del puente (no solo
    // Content-Type): acá viaja X-Respuesta-Texto, que el frontend necesita
    // para mostrar el texto de lo que dijo Edith.
    foreach (var header in respuesta.Headers)
    {
        if (string.Equals(header.Key, "Transfer-Encoding", StringComparison.OrdinalIgnoreCase))
            continue;
        ctx.Response.Headers[header.Key] = header.Value.ToArray();
    }
    foreach (var header in respuesta.Content.Headers)
    {
        ctx.Response.Headers[header.Key] = header.Value.ToArray();
    }

    await respuesta.Content.CopyToAsync(ctx.Response.Body);
});

app.Run();
