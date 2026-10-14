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
app.UseStaticFiles();

// Rutas que resuelve el puente Flask
string[] rutasPuente = { "texto", "escuchar", "conversaciones", "conversacion", "guardar_conversacion" };

app.Map("/{ruta:regex(^(texto|escuchar|conversaciones|conversacion|guardar_conversacion)$)}/{**resto}", async (HttpContext ctx, IHttpClientFactory factory, string ruta, string? resto) =>
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
    if (respuesta.Content.Headers.ContentType is not null)
        ctx.Response.ContentType = respuesta.Content.Headers.ContentType.ToString();

    await respuesta.Content.CopyToAsync(ctx.Response.Body);
});

app.MapPost("/comando", (ComandoRequest request) =>
{
    var texto = request.Texto.ToLower();
    string accion;

    if (texto.Contains("prende") || texto.Contains("prendé") || texto.Contains("encende"))
        accion = "ENCENDER_TV";
    else if (texto.Contains("apaga") || texto.Contains("apagá"))
        accion = "APAGAR_TV";
    else if (texto.Contains("subi el volumen") || texto.Contains("subí el volumen"))
        accion = "SUBIR_VOL";
    else if (texto.Contains("baja el volumen") || texto.Contains("bajar volumen"))
        accion = "BAJAR_VOL";
    else if (texto.Contains("poné música") || texto.Contains("pone musica") || texto.Contains("reproducí música") || texto.Contains("reproduci musica") || texto.Contains("musica"))
        accion = "PONER_MUSICA";
    else
        accion = "DESCONOCIDO";

    return Results.Ok(new { textoRecibido = request.Texto, accion });
});

app.Run();

record ComandoRequest(string Texto);
