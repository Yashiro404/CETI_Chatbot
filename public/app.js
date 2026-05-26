// CETI Chatbot — Frontend Logic (vanilla JS, sin dependencias externas)

(function () {
  'use strict';

  // --- DOM References ---
  var chatMessages = document.getElementById('chat-messages');
  var messageInput = document.getElementById('message-input');
  var sendButton = document.getElementById('send-button');
  var chatForm = document.getElementById('chat-form');

  // --- Event Listeners ---

  // Enable/disable send button based on input content
  messageInput.addEventListener('input', function () {
    sendButton.disabled = messageInput.value.trim().length === 0;
  });

  // Handle form submit (covers both Enter key and button click)
  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    sendMessage();
  });

  // --- Core Functions ---

  /**
   * Sends the user message to the backend and renders the response.
   */
  function sendMessage() {
    var text = messageInput.value.trim();
    if (text.length === 0) {
      return;
    }

    // Render user message
    renderMessage(text, 'user');

    // Clear input and disable button
    messageInput.value = '';
    sendButton.disabled = true;

    // Show typing indicator
    var typingIndicator = showTypingIndicator();

    // POST to backend
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
      })
      .catch(function () {
        removeTypingIndicator(typingIndicator);
        renderMessage('Lo siento, ocurrió un error al procesar tu mensaje. Intenta de nuevo.', 'bot');
      });
  }

  /**
   * Renders a message bubble in the chat area with a timestamp.
   * @param {string} text - Message text
   * @param {string} type - 'user' or 'bot'
   */
  function renderMessage(text, type) {
    var wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper message-wrapper-' + type;

    var div = document.createElement('div');
    div.className = 'message message-' + type;
    div.textContent = text;

    var time = document.createElement('span');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

    wrapper.appendChild(div);
    wrapper.appendChild(time);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
  }

  /**
   * Shows the typing indicator in the chat area.
   * @returns {HTMLElement} The typing indicator element
   */
  function showTypingIndicator() {
    var div = document.createElement('div');
    div.className = 'typing-indicator';
    div.textContent = 'Escribiendo...';
    chatMessages.appendChild(div);
    scrollToBottom();
    return div;
  }

  /**
   * Removes the typing indicator from the chat area.
   * @param {HTMLElement} indicator - The typing indicator element to remove
   */
  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  /**
   * Scrolls the chat messages area to the bottom smoothly.
   */
  function scrollToBottom() {
    var lastChild = chatMessages.lastElementChild;
    if (lastChild) {
      lastChild.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Shows a welcome message with clickable FAQ suggestion chips when the chat loads.
   */
  function showWelcomeMessage() {
    var suggestions = [
      '¿Cómo me inscribo?',
      '¿Qué carreras ofrecen?',
      '¿Cuánto cuesta?',
      '¿Qué documentos necesito?',
      '¿Dónde están ubicados?'
    ];

    // Render the welcome bot message
    renderMessage('¡Hola! Soy el asistente virtual del CETI. ¿En qué puedo ayudarte?', 'bot');

    // Create suggestions container
    var suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'suggestions';

    suggestions.forEach(function (text) {
      var chip = document.createElement('button');
      chip.className = 'suggestion-chip';
      chip.textContent = text;
      chip.type = 'button';
      chip.addEventListener('click', function () {
        messageInput.value = text;
        sendMessage();
      });
      suggestionsContainer.appendChild(chip);
    });

    chatMessages.appendChild(suggestionsContainer);
    scrollToBottom();
  }

  // Show welcome message on load
  showWelcomeMessage();
})();
