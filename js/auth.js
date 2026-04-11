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

// 5. Gestión de Archivos: Subir (Detecta Unidad y Semana)
async function subirArchivo(input, semana) {
  const file = input.files[0];
  if (!file) return;

  // 1. Obtenemos la unidad y limpiamos espacios
  const unidadActual = (document.body.dataset.unidad || "unidad1").trim();

  // 2. Limpiamos el nombre del archivo (QUITAMOS TILDES Y ESPACIOS)
  // Esto evita el error de "Invalid Key"
  const nombreLimpio = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .replace(/[^a-zA-Z0-9.]/g, "_"); // Cambia todo lo raro por guion bajo

  const timestamp = Date.now();

  // 3. CONSTRUIMOS LA RUTA (Sin barras iniciales ni espacios)
  const filePath = `${unidadActual}/semana${semana}_${timestamp}.pdf`;

  console.log("Intentando subir a ruta:", filePath);

  const { data, error } = await clientSupabase.storage
    .from("proyectos")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Detalle del error:", error);
    alert("Error de Supabase: " + error.message);
  } else {
    alert("¡Archivo subido con éxito!");
    cargarArchivosDeSemana(semana);
  }
}

// 6. Gestión de Archivos: Listar dinámicamente según la Unidad
async function cargarArchivosDeSemana(numeroSemana) {
  const contenedor = document.getElementById(`archivos-semana-${numeroSemana}`);
  if (!contenedor) return;

  const unidadActual = document.body.dataset.unidad || "unidad1";

  // Consultamos los archivos
  const { data, error } = await clientSupabase.storage
    .from("proyectos")
    .list(unidadActual, {
      limit: 100,
      search: `semana${numeroSemana}`,
    });

  if (error) {
    contenedor.innerHTML = `<small class="text-danger">Error al cargar</small>`;
    return;
  }

  if (!data || data.length === 0) {
    contenedor.innerHTML = `<small class="text-muted">No hay archivos aún.</small>`;
    return;
  }

  // VERIFICACIÓN DE ADMIN: Obtenemos el usuario actual
  const {
    data: { user },
  } = await clientSupabase.auth.getUser();

  contenedor.innerHTML = "";
  data.forEach((archivo) => {
    const urlPublica = `${supabaseUrl}/storage/v1/object/public/proyectos/${unidadActual}/${archivo.name}`;

    // Si hay usuario (Gabriel), creamos el botón de borrar. Si no, queda vacío.
    const botonBorrar = user
      ? `<button onclick="eliminarArchivo('${unidadActual}/${archivo.name}', ${numeroSemana})" class="btn btn-sm btn-outline-danger ml-2 border-0">
          <i class="fa fa-trash"></i>
         </button>`
      : "";

    contenedor.innerHTML += `
      <div class="d-flex align-items-center justify-content-between bg-white p-2 mb-2 rounded border shadow-sm">
        <span class="small text-truncate mr-2">
          <i class="fa fa-file-pdf text-danger mr-2"></i>${archivo.name}
        </span>
        <div class="d-flex align-items-center">
          <a href="${urlPublica}" target="_blank" class="btn btn-sm btn-outline-primary" download>
            <i class="fa fa-download"></i>
          </a>
          ${botonBorrar}
        </div>
      </div>
    `;
  });
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
