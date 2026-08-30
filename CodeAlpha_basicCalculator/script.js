document.addEventListener('DOMContentLoaded', () => {
  const mainDisplay = document.getElementById('main-display');
  const exprDisplay = document.getElementById('expression-display');
  const historyToggleBtn = document.getElementById('history-toggle-btn');
  const historyPanel = document.getElementById('history-panel');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('btn-clear-history');
  const keypad = document.querySelector('.calculator-keypad');

  // Calculator State
  let currentInput = '0';
  let previousInput = '';
  let activeOperator = null;
  let expression = '';
  let shouldResetScreen = false;
  let calculationHistory = [];

  // Initialize display
  updateDisplay();

  // Handle Button Clicks
  keypad.addEventListener('click', (e) => {
    const target = e.target.closest('button');
    if (!target) return;

    const value = target.dataset.value;
    const action = target.dataset.action;

    triggerButtonAction(target, value, action);
  });

  // Toggle History Panel
  historyToggleBtn.addEventListener('click', () => {
    historyPanel.classList.toggle('open');
  });

  // Close History Panel if clicked outside
  document.addEventListener('click', (e) => {
    if (!historyPanel.contains(e.target) && 
        !historyToggleBtn.contains(e.target) && 
        historyPanel.classList.contains('open')) {
      historyPanel.classList.remove('open');
    }
  });

  // Clear History
  clearHistoryBtn.addEventListener('click', () => {
    calculationHistory = [];
    renderHistory();
  });

  // Keyboard Support
  document.addEventListener('keydown', (e) => {
    let key = e.key;
    let targetButton = null;

    // Map Keyboard keys to Calculator buttons
    if (key >= '0' && key <= '9') {
      targetButton = document.querySelector(`button[data-value="${key}"]`);
    } else if (key === '.') {
      targetButton = document.getElementById('btn-decimal');
    } else if (key === '+') {
      targetButton = document.getElementById('btn-add');
    } else if (key === '-') {
      targetButton = document.getElementById('btn-subtract');
    } else if (key === '*') {
      targetButton = document.getElementById('btn-multiply');
    } else if (key === '/') {
      targetButton = document.getElementById('btn-divide');
    } else if (key === 'Enter' || key === '=') {
      e.preventDefault();
      targetButton = document.getElementById('btn-equals');
    } else if (key === 'Backspace') {
      targetButton = document.getElementById('btn-backspace');
    } else if (key === 'Escape') {
      targetButton = document.getElementById('btn-clear');
    } else if (key === '%') {
      targetButton = document.getElementById('btn-percent');
    }

    if (targetButton) {
      targetButton.classList.add('active-press');
      targetButton.click();
      setTimeout(() => {
        targetButton.classList.remove('active-press');
      }, 150);
    }
  });

  // Core functions
  function triggerButtonAction(button, value, action) {
    if (!action) {
      // It's a number digit or decimal
      inputDigit(value);
    } else {
      switch (action) {
        case 'clear':
          clearAll();
          break;
        case 'backspace':
          handleBackspace();
          break;
        case 'percent':
          applyPercent();
          break;
        case 'toggle-sign':
          toggleSign();
          break;
        case 'operator':
          handleOperator(value);
          break;
        case 'equals':
          evaluateExpression();
          break;
      }
    }
    updateDisplay();
  }

  function inputDigit(digit) {
    if (shouldResetScreen) {
      currentInput = '';
      shouldResetScreen = false;
    }

    if (digit === '.') {
      if (currentInput.includes('.')) return; // Prevent multiple decimals
      if (currentInput === '') currentInput = '0';
    }

    if (currentInput === '0' && digit !== '.') {
      currentInput = digit;
    } else {
      currentInput += digit;
    }
  }

  // Backspace handler
  function handleBackspace() {
    if (shouldResetScreen) return;
    if (currentInput.length > 1) {
      currentInput = currentInput.slice(0, -1);
    } else {
      currentInput = '0';
    }
  }

  // Reset variables
  function clearAll() {
    currentInput = '0';
    previousInput = '';
    activeOperator = null;
    expression = '';
    shouldResetScreen = false;
  }

  function applyPercent() {
    if (currentInput === '0' || currentInput === 'Error') return;
    currentInput = (parseFloat(currentInput) / 100).toString();
  }

  function toggleSign() {
    if (currentInput === '0' || currentInput === 'Error') return;
    if (currentInput.startsWith('-')) {
      currentInput = currentInput.substring(1);
    } else {
      currentInput = '-' + currentInput;
    }
  }

  function handleOperator(op) {
    if (currentInput === 'Error') return;

    if (activeOperator && !shouldResetScreen) {
      evaluateExpression();
    }

    previousInput = currentInput;
    activeOperator = op;
    expression = `${formatNumberForExpression(previousInput)} ${getOperatorSymbol(op)}`;
    shouldResetScreen = true;
  }

  function evaluateExpression() {
    if (!activeOperator || shouldResetScreen) return;

    const val1 = parseFloat(previousInput);
    const val2 = parseFloat(currentInput);

    if (isNaN(val1) || isNaN(val2)) return;

    let result = 0;
    switch (activeOperator) {
      case '+':
        result = val1 + val2;
        break;
      case '-':
        result = val1 - val2;
        break;
      case '*':
        result = val1 * val2;
        break;
      case '/':
        if (val2 === 0) {
          currentInput = 'Error';
          expression = '';
          activeOperator = null;
          shouldResetScreen = true;
          return;
        }
        result = val1 / val2;
        break;
    }

    const roundedResult = roundResult(result);
    
    const fullExpression = `${formatNumberForExpression(previousInput)} ${getOperatorSymbol(activeOperator)} ${formatNumberForExpression(currentInput)}`;
    addHistoryItem(fullExpression, roundedResult.toString());

    expression = '';
    currentInput = roundedResult.toString();
    activeOperator = null;
    shouldResetScreen = true;
  }

  function roundResult(num) {
    return Math.round(num * 1e10) / 1e10;
  }

  function getOperatorSymbol(op) {
    switch (op) {
      case '+': return '+';
      case '-': return '−';
      case '*': return '×';
      case '/': return '÷';
      default: return op;
    }
  }

  function formatNumberForExpression(numStr) {
    if (numStr.startsWith('-')) {
      return `(${numStr})`;
    }
    return numStr;
  }

  function updateDisplay() {
    if (currentInput.length > 12) {
      mainDisplay.style.fontSize = '24px';
    } else if (currentInput.length > 8) {
      mainDisplay.style.fontSize = '32px';
    } else {
      mainDisplay.style.fontSize = '42px';
    }

    mainDisplay.textContent = currentInput;
    exprDisplay.textContent = expression;
  }

  function addHistoryItem(expr, res) {
    calculationHistory.unshift({ expr, res });
    renderHistory();
  }

  function renderHistory() {
    if (calculationHistory.length === 0) {
      historyList.innerHTML = '<p class="no-history-msg">No history yet</p>';
      return;
    }

    historyList.innerHTML = '';
    calculationHistory.forEach((item) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <span class="history-item-expr">${item.expr} =</span>
        <span class="history-item-result">${item.res}</span>
      `;
      historyItem.addEventListener('click', () => {
        currentInput = item.res;
        expression = '';
        activeOperator = null;
        shouldResetScreen = true;
        updateDisplay();
        historyPanel.classList.remove('open');
      });
      historyList.appendChild(historyItem);
    });
  }
});
