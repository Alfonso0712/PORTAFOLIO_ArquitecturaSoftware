// 1. Configuración de Supabase
const supabaseUrl = "https://slejdjsexoiprnstknbj.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsZWpkanNleG9pcHJuc3RrbmJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5MTI1NDIsImV4cCI6MjA5MTQ4ODU0Mn0.uoR-akVPmJ-B6SMXJ8Fn0aKbHcxb2oorRW3cuceyiCQ";

const clientSupabase = supabase.createClient(supabaseUrl, supabaseKey);

// 2. Autenticación: Iniciar Sesión
async function iniciarSesion(email, password) {
  const { data, error } = await clientSupabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("¡Acceso concedido, Gabriel!");
    window.location.href = "index.html";
  }
}

// 3. Autenticación: Cerrar Sesión
async function cerrarSesion() {
  await clientSupabase.auth.signOut();
  window.location.reload();
}

// 4. Seguridad: Verificar Sesión y Mostrar Panel Admin
async function verificarSesion() {
  const {
    data: { user },
  } = await clientSupabase.auth.getUser();

  if (user) {
    // Muestra los inputs de subida
    const adminElements = document.querySelectorAll(".admin-only");
    adminElements.forEach((el) =>
      el.style.setProperty("display", "block", "important"),
    );

    // Cambia botón LOGIN por LOGOUT
    const loginBtn = document.querySelector(".btn-primary");
    if (
      loginBtn &&
      (loginBtn.innerText === "LOGIN" || loginBtn.innerText === "LOGIN ")
    ) {
      loginBtn.innerText = "LOGOUT";
      loginBtn.href = "#";
      loginBtn.onclick = cerrarSesion;
    }
  }
}

// 5. Gestión de Archivos: Subir (Mantiene nombre original + Prefijo Semana)
async function subirArchivo(input, semana) {
  const file = input.files[0];
  if (!file) return;

  // 1. Obtenemos la unidad
  const unidadActual = (document.body.dataset.unidad || "unidad1").trim();

  // 2. PROCESAMOS EL NOMBRE ORIGINAL
  // Separamos el nombre de la extensión (ejemplo: "DNI" y ".pdf")
  const nombreOriginal = file.name;
  const ultimaPosicionPunto = nombreOriginal.lastIndexOf(".");
  const extension = nombreOriginal.substring(ultimaPosicionPunto); // .pdf, .jpg, etc.
  const nombreSinExtension = nombreOriginal.substring(0, ultimaPosicionPunto);

  // 3. LIMPIAMOS EL NOMBRE (Quitamos tildes, espacios y caracteres raros)
  const nombreLimpio = nombreSinExtension
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .replace(/[^a-zA-Z0-9]/g, "_"); // Cambia espacios y raros por "_"

  // 4. CONSTRUIMOS EL NUEVO NOMBRE: semanaX_nombreOriginal.extension
  const nuevoNombre = `semana${semana}_${nombreLimpio}${extension}`;

  // 5. RUTA COMPLETA EN EL STORAGE
  const filePath = `${unidadActual}/${nuevoNombre}`;

  console.log("Subiendo como:", nuevoNombre);

  const { data, error } = await clientSupabase.storage
    .from("proyectos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Si el archivo existe con el mismo nombre, lo actualiza
      contentType: "application/octet-stream", // Para forzar descarga luego
    });

  if (error) {
    console.error("Detalle del error:", error);
    alert("Error de Supabase: " + error.message);
  } else {
    alert(`¡Archivo "${nuevoNombre}" subido con éxito!`);
    cargarArchivosDeSemana(semana);
  }
}

// MODIFICACIÓN EN LA FUNCIÓN 6: Listar archivos
async function cargarArchivosDeSemana(numeroSemana) {
  const contenedor = document.getElementById(`archivos-semana-${numeroSemana}`);
  if (!contenedor) return;

  const unidadActual = document.body.dataset.unidad || "unidad1";

  const { data, error } = await clientSupabase.storage
    .from("proyectos")
    .list(unidadActual, {
      limit: 100,
      search: `semana${numeroSemana}`,
    });

  if (error || !data || data.length === 0) {
    contenedor.innerHTML =
      data?.length === 0
        ? `<small class="text-muted">No hay archivos aún.</small>`
        : `<small class="text-danger">Error al cargar</small>`;
    return;
  }

  const {
    data: { user },
  } = await clientSupabase.auth.getUser();

  contenedor.innerHTML = "";
  data.forEach((archivo) => {
    const urlPublica = `${supabaseUrl}/storage/v1/object/public/proyectos/${unidadActual}/${archivo.name}`;

    const botonBorrar = user
      ? `<button onclick="eliminarArchivo('${unidadActual}/${archivo.name}', ${numeroSemana})" class="btn btn-sm btn-outline-danger border-0"><i class="fa fa-trash"></i></button>`
      : "";

    contenedor.innerHTML += `
      <div class="file-item-tech">
        <div class="d-flex align-items-center overflow-hidden">
          <i class="far fa-file-alt text-primary mr-3"></i>
          <span class="text-white small text-truncate font-weight-bold">${archivo.name}</span>
        </div>
        <div class="d-flex align-items-center">
          <button onclick="verPDF('${urlPublica}', '${archivo.name}')" class="btn btn-sm btn-outline-primary border-0">
            <i class="fa fa-eye"></i>
          </button>
          
          <button onclick="forzarDescarga('${urlPublica}', '${archivo.name}')" class="btn btn-sm btn-outline-info border-0">
            <i class="fa fa-download"></i>
          </button>

          ${botonBorrar}
        </div>
      </div>
    `;
  });
}
// NUEVA FUNCIÓN: Fuerza la descarga convirtiendo el archivo en un BLOB
async function forzarDescarga(url, nombreArchivo) {
  try {
    const respuesta = await fetch(url);
    const blob = await respuesta.blob(); // Convertimos el archivo a datos puros
    const urlBlob = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = urlBlob;
    link.download = nombreArchivo; // Aquí el navegador NO tiene otra opción más que descargar
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(urlBlob); // Limpiamos memoria
  } catch (error) {
    console.error("Error en descarga:", error);
    // Si falla el método pro, abrimos en ventana nueva como respaldo
    window.open(url, "_blank");
  }
}
// NUEVA FUNCIÓN: Eliminar archivo de Supabase
async function eliminarArchivo(rutaCompleta, semana) {
  const confirmar = confirm("¿Gabriel, estás seguro de borrar este archivo?");

  if (confirmar) {
    const { data, error } = await clientSupabase.storage
      .from("proyectos")
      .remove([rutaCompleta]);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      alert("Archivo eliminado correctamente.");
      cargarArchivosDeSemana(semana); // Recargamos solo la semana actual
    }
  }
}
// 7. Inicialización automática
document.addEventListener("DOMContentLoaded", () => {
  verificarSesion();
  // Esto cargará las 4 semanas que correspondan a la página abierta
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].forEach((s) =>
    cargarArchivosDeSemana(s),
  );
});

function verPDF(url, nombre) {
  document.getElementById("pdfFrame").src = url;
  document.getElementById("pdfNombre").innerText = nombre;
  $("#pdfModal").modal("show"); // Dispara el modal de Bootstrap
}
