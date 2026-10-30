document.addEventListener('DOMContentLoaded', () => {
  const API_LOGIN_URL = '../api/endpoints/login.php';
  const API_USUARIOS_URL = '../api/endpoints/usuarios.php';
  const API_CARRERAS_URL = '../api/endpoints/carreras.php';
  const API_INSTITUCIONES_URL = '../api/endpoints/instituciones.php';

  const loginCard = document.getElementById('loginCard');
  const registerCard = document.getElementById('registerCard');
  const showRegisterBtn = document.getElementById('showRegister');
  const showLoginBtn = document.getElementById('showLogin');

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  const alertBox = document.getElementById('alertBox');
  const alertBoxReg = document.getElementById('alertBoxReg');
  const loginBtn = document.getElementById('loginBtn');
  const regBtn = document.getElementById('regBtn');
  const toggleLoginPassword = document.getElementById('toggleLoginPassword');

  const regCarreraSelect = document.getElementById('regCarrera');
  const regInstitucionSelect = document.getElementById('regInstitucion');

  // Cargar lista de instituciones desde la API
  async function loadInstituciones() {
    if (!regInstitucionSelect) return;
    try {
      const response = await fetch(API_INSTITUCIONES_URL);
      const resData = await response.json();
      const instituciones = resData.data || resData;

      if (Array.isArray(instituciones) && instituciones.length > 0) {
        regInstitucionSelect.innerHTML = '<option value="">Selecciona tu Institución (Opcional)</option>';
        instituciones.forEach(inst => {
          const option = document.createElement('option');
          option.value = inst.id;
          option.textContent = inst.nombre;
          regInstitucionSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error al cargar instituciones:', err);
    }
  }

  // Cargar lista de carreras desde la API
  async function loadCarreras() {
    if (!regCarreraSelect) return;
    try {
      const response = await fetch(API_CARRERAS_URL);
      const resData = await response.json();
      const carreras = resData.data || resData;

      if (Array.isArray(carreras) && carreras.length > 0) {
        regCarreraSelect.innerHTML = '<option value="">Selecciona tu Carrera (Opcional)</option>';
        carreras.forEach(carrera => {
          const option = document.createElement('option');
          option.value = carrera.id;
          option.textContent = carrera.nombre;
          regCarreraSelect.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Error al cargar carreras:', err);
    }
  }

  // Cargar desplegables al iniciar
  loadInstituciones();
  loadCarreras();

  // Alternar pantallas
  if (showRegisterBtn) {
    showRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginCard.classList.add('hidden');
      registerCard.classList.remove('hidden');
    });
  }

  if (showLoginBtn) {
    showLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerCard.classList.add('hidden');
      loginCard.classList.remove('hidden');
    });
  }

  // Toggle contraseña
  if (toggleLoginPassword) {
    toggleLoginPassword.addEventListener('click', () => {
      const loginPassword = document.getElementById('loginPassword');
      const isPassword = loginPassword.getAttribute('type') === 'password';
      loginPassword.setAttribute('type', isPassword ? 'text' : 'password');
      toggleLoginPassword.classList.toggle('fa-eye', !isPassword);
      toggleLoginPassword.classList.toggle('fa-eye-slash', isPassword);
    });
  }

  function showAlert(element, message, type = 'error') {
    if (!element) return;
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.classList.remove('hidden');
  }

  // INICIO DE SESIÓN (LOGIN)
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.classList.add('hidden');
      loginBtn.disabled = true;
      loginBtn.textContent = 'Autenticando...';

      const formData = new FormData();
      formData.append('identificador', document.getElementById('loginIdentificador').value.trim());
      formData.append('contrasena', document.getElementById('loginPassword').value);

      try {
        const response = await fetch(API_LOGIN_URL, {
          method: 'POST',
          body: formData
        });

        const resData = await response.json();

        if (response.ok && (resData.code >= 0 || resData.status === 'success' || resData.success)) {
          showAlert(alertBox, '¡Autenticación correcta! Redirigiendo...', 'success');
          if (resData.data) {
            localStorage.setItem('usuario', JSON.stringify(resData.data));
          }
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
        } else {
          showAlert(alertBox, resData.message || 'Credenciales incorrectas.', 'error');
        }
      } catch (err) {
        console.error('Error de login:', err);
        showAlert(alertBox, 'Error de conexión con el servidor.', 'error');
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Ingresar al Sistema';
      }
    });
  }

  // REGISTRO DE USUARIOS
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBoxReg.classList.add('hidden');
      regBtn.disabled = true;
      regBtn.textContent = 'Registrando...';

      const instId = regInstitucionSelect.value ? parseInt(regInstitucionSelect.value, 10) : 0;
      const carreraId = regCarreraSelect.value ? parseInt(regCarreraSelect.value, 10) : 0;

      const payload = {
        username: document.getElementById('regUsername').value.trim(),
        nombre: document.getElementById('regNombre').value.trim(),
        apellido: document.getElementById('regApellido').value.trim(),
        email: document.getElementById('regCorreo').value.trim(),
        password: document.getElementById('regPassword').value,
        rol_id: 1,
        institucion_id: instId,
        carrera_id: carreraId,
        carnet: document.getElementById('regCarnet').value.trim(),
        telefono: document.getElementById('regTelefono').value.trim(),
        biografia: ''
      };

      try {
        const response = await fetch(API_USUARIOS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (response.ok && (resData.code >= 0 || resData.status === 'success' || resData.success)) {
          showAlert(alertBoxReg, '¡Cuenta creada con éxito! Ya puedes iniciar sesión.', 'success');
          setTimeout(() => {
            registerForm.reset();
            registerCard.classList.add('hidden');
            loginCard.classList.remove('hidden');
            alertBoxReg.classList.add('hidden');
          }, 1500);
        } else {
          showAlert(alertBoxReg, resData.message || 'Error al registrar el usuario.', 'error');
        }
      } catch (err) {
        console.error('Error de registro:', err);
        showAlert(alertBoxReg, 'Error al conectar con el servidor.', 'error');
      } finally {
        regBtn.disabled = false;
        regBtn.textContent = 'Registrarse';
      }
    });
  }
});