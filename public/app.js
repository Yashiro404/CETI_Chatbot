// CETI Chatbot — Frontend Logic (vanilla JS + Firebase SDK compat)

(function () {
  'use strict';

  // --- DOM References: chat ---
  var chatMessages = document.getElementById('chat-messages');
  var messageInput = document.getElementById('message-input');
  var sendButton = document.getElementById('send-button');
  var chatForm = document.getElementById('chat-form');

  // --- DOM References: auth controls ---
  var loginBtn = document.getElementById('login-btn');
  var logoutBtn = document.getElementById('logout-btn');
  var clearHistoryBtn = document.getElementById('clear-history-btn');
  var userLabel = document.getElementById('user-label');

  // --- DOM References: modal ---
  var authModal = document.getElementById('auth-modal');
  var authForm = document.getElementById('auth-form');
  var authModalTitle = document.getElementById('auth-modal-title');
  var authEmailInput = document.getElementById('auth-email');
  var authPasswordInput = document.getElementById('auth-password');
  var authError = document.getElementById('auth-error');
  var authInfo = document.getElementById('auth-info');
  var authSubmit = document.getElementById('auth-submit');
  var authCancel = document.getElementById('auth-cancel');

  // --- Firebase handles (inicialización defensiva) ---
  // Si las claves no están configuradas o el SDK falla, el chatbot sigue
  // funcionando en modo anónimo: solo se desactivan login/registro e historial.
  var fbAuth = null;
  var fbDb = null;
  var firebaseReady = false;
  var currentUser = null;

  try {
    if (typeof firebase !== 'undefined' &&
        firebase.apps && firebase.apps.length > 0 &&
        firebase.app().options && firebase.app().options.apiKey) {
      fbAuth = firebase.auth();
      fbDb = firebase.firestore();
      firebaseReady = true;
    }
  } catch (e) {
    firebaseReady = false;
  }

  // ============================================================
  // ui — renderizado de estado de sesión y modal
  // ============================================================
  var ui = {
    renderAuthState: function (user) {
      if (user) {
        loginBtn.hidden = true;
        userLabel.hidden = false;
        userLabel.textContent = user.email;
        clearHistoryBtn.hidden = false;
        logoutBtn.hidden = false;
      } else {
        loginBtn.hidden = false;
        userLabel.hidden = true;
        userLabel.textContent = '';
        clearHistoryBtn.hidden = true;
        logoutBtn.hidden = true;
      }
    },

    openModal: function (mode) {
      authForm.dataset.mode = mode;
      var isLogin = mode === 'login';
      authModalTitle.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
      authSubmit.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';

      var tabs = document.querySelectorAll('.auth-tabs button');
      tabs.forEach(function (tab) {
        if (tab.dataset.mode === mode) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      authError.textContent = '';
      authInfo.textContent = '';
      if (typeof authModal.showModal === 'function') {
        authModal.showModal();
      } else {
        authModal.setAttribute('open', '');
      }
    },

    closeModal: function () {
      if (typeof authModal.close === 'function') {
        authModal.close();
      } else {
        authModal.removeAttribute('open');
      }
    },

    showAuthError: function (msg) {
      authInfo.textContent = '';
      authError.textContent = msg;
    },

    showAuthInfo: function (msg) {
      authError.textContent = '';
      authInfo.textContent = msg;
    },

    clearMessages: function () {
      chatMessages.innerHTML = '';
    },

    showWelcomeMessage: function () {
      var suggestions = [
        '¿Cómo me inscribo?',
        '¿Qué carreras ofrecen?',
        '¿Cuánto cuesta?',
        '¿Qué documentos necesito?',
        '¿Dónde están ubicados?'
      ];

      renderMessage('¡Hola! Soy el asistente virtual del CETI. ¿En qué puedo ayudarte?', 'bot');

      var suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'suggestions';

      suggestions.forEach(function (text) {
        var chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = text;
        chip.type = 'button';
        chip.addEventListener('click', function () {
          messageInput.value = text;
          sendButton.disabled = false;
          sendMessage();
        });
        suggestionsContainer.appendChild(chip);
      });

      chatMessages.appendChild(suggestionsContainer);
      scrollToBottom();
    }
  };

  // ============================================================
  // historyStore — persistencia del historial en Firestore
  //   Colección: users/{uid}/history/{autoId}
  // ============================================================
  var historyStore = {
    collectionRef: function () {
      if (!currentUser) return null;
      return fbDb.collection('users').doc(currentUser.uid).collection('history');
    },

    append: function (pregunta, respuesta) {
      var col = historyStore.collectionRef();
      if (!col) return Promise.resolve();
      return col.add({
        pregunta: pregunta,
        respuesta: respuesta,
        fecha: new Date().toISOString()
      }).catch(function (err) {
        // No interrumpir la conversación si falla el guardado
        console.error('Error al guardar historial:', err);
      });
    },

    load: function () {
      var col = historyStore.collectionRef();
      if (!col) return Promise.resolve([]);
      return col.orderBy('fecha', 'asc').limit(200).get().then(function (snap) {
        var entries = [];
        snap.forEach(function (doc) {
          entries.push(doc.data());
        });
        return entries;
      });
    },

    clear: function () {
      var col = historyStore.collectionRef();
      if (!col) return Promise.resolve(0);
      return col.get().then(function (snap) {
        var batch = fbDb.batch();
        var count = 0;
        snap.forEach(function (doc) {
          batch.delete(doc.ref);
          count += 1;
        });
        return batch.commit().then(function () {
          return count;
        });
      });
    }
  };

  // ============================================================
  // history — orquestación de carga/limpieza en la UI
  // ============================================================
  var history = {
    loadAndRender: function () {
      ui.clearMessages();
      var loading = document.createElement('div');
      loading.className = 'typing-indicator';
      loading.textContent = 'Cargando historial...';
      chatMessages.appendChild(loading);

      historyStore.load()
        .then(function (entries) {
          ui.clearMessages();
          if (entries.length === 0) {
            ui.showWelcomeMessage();
            return;
          }
          entries.forEach(function (entry) {
            renderMessage(entry.pregunta, 'user', entry.fecha);
            renderMessage(entry.respuesta, 'bot', entry.fecha);
          });
        })
        .catch(function (err) {
          console.error('Error al cargar historial:', err);
          ui.clearMessages();
          ui.showWelcomeMessage();
        });
    },

    clearConfirm: function () {
      if (!confirm('¿Estás seguro de que deseas limpiar tu historial de chat?')) {
        return;
      }
      historyStore.clear()
        .then(function () {
          ui.clearMessages();
          ui.showWelcomeMessage();
        })
        .catch(function (err) {
          console.error('Error al limpiar historial:', err);
          renderMessage('No se pudo limpiar el historial. Intenta de nuevo.', 'bot');
        });
    }
  };

  // ============================================================
  // authFlow — registro, login, logout
  // ============================================================
  var authFlow = {
    submit: function (mode, email, password) {
      if (!firebaseReady) {
        ui.showAuthError('El servicio de cuentas no está disponible. Puedes seguir usando el chat sin iniciar sesión.');
        return;
      }
      authSubmit.disabled = true;
      authError.textContent = '';
      authInfo.textContent = '';

      var op;
      if (mode === 'register') {
        op = fbAuth.createUserWithEmailAndPassword(email, password)
          .then(function (cred) {
            // Enviar correo de verificación (confirmación). Firebase lo gestiona.
            return cred.user.sendEmailVerification().then(function () {
              ui.showAuthInfo(
                '¡Cuenta creada! Te enviamos un correo de confirmación a ' + email +
                '. Revisa tu bandeja de entrada.'
              );
            });
          });
      } else {
        op = fbAuth.signInWithEmailAndPassword(email, password);
      }

      op
        .then(function () {
          // onAuthStateChanged se encarga del render y carga de historial.
          // En registro mantenemos el modal abierto un momento para mostrar el aviso.
          if (mode === 'login') {
            ui.closeModal();
          } else {
            setTimeout(ui.closeModal, 2500);
          }
        })
        .catch(function (err) {
          ui.showAuthError(authFlow.translateError(err));
        })
        .finally(function () {
          authSubmit.disabled = false;
        });
    },

    logout: function () {
      if (!firebaseReady) return;
      fbAuth.signOut().catch(function (err) {
        console.error('Error al cerrar sesión:', err);
      });
    },

    /** Traduce los códigos de error de Firebase a mensajes en español. */
    translateError: function (err) {
      var code = err && err.code ? err.code : '';
      switch (code) {
        case 'auth/email-already-in-use':
          return 'Ese correo ya está registrado. Intenta iniciar sesión.';
        case 'auth/invalid-email':
          return 'El correo electrónico no es válido.';
        case 'auth/weak-password':
          return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return 'Correo o contraseña incorrectos.';
        case 'auth/too-many-requests':
          return 'Demasiados intentos. Espera un momento e intenta de nuevo.';
        default:
          return 'Ocurrió un error. Intenta de nuevo.';
      }
    }
  };

  // ============================================================
  // chat — envío de mensajes (pipeline existente intacto)
  // ============================================================
  function sendMessage() {
    var text = messageInput.value.trim();
    if (text.length === 0) {
      return;
    }

    renderMessage(text, 'user');
    messageInput.value = '';
    sendButton.disabled = true;

    var typingIndicator = showTypingIndicator();

    fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: text })
    })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Error del servidor: ' + response.status);
        }
        return response.json();
      })
      .then(function (data) {
        removeTypingIndicator(typingIndicator);
        renderMessage(data.respuesta, 'bot');
        // Guardar en el historial del usuario si hay sesión
        if (currentUser) {
          historyStore.append(text, data.respuesta);
        }
      })
      .catch(function () {
        removeTypingIndicator(typingIndicator);
        renderMessage('Lo siento, ocurrió un error al procesar tu mensaje. Intenta de nuevo.', 'bot');
      });
  }

  // ============================================================
  // Helpers de renderizado (chat)
  // ============================================================
  function renderMessage(text, type, isoDate) {
    var wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper message-wrapper-' + type;

    var div = document.createElement('div');
    div.className = 'message message-' + type;
    div.textContent = text;

    var time = document.createElement('span');
    time.className = 'message-time';
    var dateObj = isoDate ? new Date(isoDate) : new Date();
    time.textContent = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

    wrapper.appendChild(div);
    wrapper.appendChild(time);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  function showTypingIndicator() {
    var div = document.createElement('div');
    div.className = 'typing-indicator';
    div.textContent = 'Escribiendo...';
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
  }

  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  function scrollToBottom() {
    var lastChild = chatMessages.lastElementChild;
    if (lastChild) {
      lastChild.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ============================================================
  // Event wiring
  // ============================================================
  messageInput.addEventListener('input', function () {
    sendButton.disabled = messageInput.value.trim().length === 0;
  });

  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage();
  });

  loginBtn.addEventListener('click', function () {
    ui.openModal('login');
  });

  logoutBtn.addEventListener('click', function () {
    authFlow.logout();
  });

  clearHistoryBtn.addEventListener('click', function () {
    history.clearConfirm();
  });

  document.querySelectorAll('.auth-tabs button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      ui.openModal(btn.dataset.mode);
    });
  });

  authCancel.addEventListener('click', function () {
    ui.closeModal();
  });

  authForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var mode = authForm.dataset.mode || 'login';
    var email = authEmailInput.value.trim();
    var password = authPasswordInput.value;
    authFlow.submit(mode, email, password);
  });

  // ============================================================
  // Bootstrap — estado inicial
  // ============================================================
  // El chat anónimo SIEMPRE funciona, independientemente de Firebase.
  // La conversación anónima vive solo en memoria: al recargar se reinicia.
  ui.clearMessages();
  ui.showWelcomeMessage();

  if (firebaseReady) {
    // Reacción a cambios de estado de sesión (login/logout)
    fbAuth.onAuthStateChanged(function (user) {
      currentUser = user || null;
      ui.renderAuthState(currentUser);

      if (currentUser) {
        // Usuario autenticado: cargar su historial persistido
        history.loadAndRender();
      } else {
        // Anónimo: conversación en memoria, se reinicia al recargar
        ui.clearMessages();
        ui.showWelcomeMessage();
      }
    });
  } else {
    // Firebase no configurado: ocultar el botón de iniciar sesión.
    // El chat anónimo permanece plenamente funcional.
    loginBtn.hidden = true;
    console.warn('Firebase no está configurado: login e historial deshabilitados. El chat anónimo sigue disponible.');
  }
})();
