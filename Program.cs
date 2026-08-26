var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

//app.UseHttpsRedirection();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapPost("/comando", (ComandoRequest request) =>
{
    var texto = request.Texto.ToLower();

    string accion;
    if (texto.Contains("prende") || texto.Contains("prendé") || texto.Contains("encende"))
        accion = "ENCENDER_TV";
    else if (texto.Contains("apaga") || texto.Contains("apagá"))
        accion = "APAGAR_TV";

    else if (texto.Contains ("subi el volumen") || texto.Contains ("subí el volumen"))
    accion = "SUBIR_VOL";

    else if(texto.Contains ("baja el volumen") || texto.Contains ("bajar volumen"))
    accion = "BAJAR_VOL";
    
    else if (texto.Contains("poné música") || texto.Contains("pone musica") || texto.Contains("reproducí música") || texto.Contains("reproduci musica") || texto.Contains("musica"))
        accion = "PONER_MUSICA";
    else
        accion = "DESCONOCIDO";

    return Results.Ok(new { textoRecibido = request.Texto, accion });
});

app.Run();

record ComandoRequest(string Texto);
