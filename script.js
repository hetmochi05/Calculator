const display = document.getElementById("display");
const operators = ["+", "-", "*", "/"];
let clickSound;

try {
    clickSound = new Audio("Music.mp3");
} catch { }

const themeLink = document.getElementById("theme-style");

let justCalculated = false; // Tracks if last action was a calculation

const historyList = document.getElementById("history-list");
let history = [];


// Sound effect
function playClick() {
    if (!clickSound) return;
    clickSound.volume = 0.3;
    clickSound.currentTime = 0;
    clickSound.play().catch(()=>{});
}


// Append value to display
function appendValue(value) {

    playClick();  // ← play sound
    haptic("light"); // ← haptic feedback


    const lastChar = display.value.slice(-1);

    if (display.value === "Error") {
        display.value = "0";
    }
    // Block input if Error is shown
    if (display.value === "Error") return;

    // Clear display if last was a calculation and new number is pressed
    if (justCalculated && !operators.includes(value)) {
        display.value = "0"; // ← alternative: clear display
        justCalculated = false;
    }

    // Prevent starting with operator (except -)
    if (display.value === "0" && operators.includes(value) && value !== "-") return;

    // Operator handling
    if (operators.includes(value)) {

        // Allow starting negative number
        if (display.value === "0" && value === "-") {
            display.value = "-";
            return;
        }

        // Prevent operator spam EXCEPT "+-" or "*-" or "/-"
        if (operators.includes(lastChar)) {

            // Allow negative number after operator
            if (value === "-" && lastChar !== "-") {
                display.value += "-";
                return;
            }

            // Replace operator
            display.value = display.value.slice(0, -1) + value;
            return;
        }
    }

    // Prevent "."
    if (value === "." && display.value.slice(-1) === ".") return;

    // Auto add 0 before "."
    if (value === "." && operators.includes(display.value.slice(-1))) {
        display.value += "0";
    }

    if (value === "." && display.value === "0") {
        display.value = "0.";
        return;
    }

    // Prevent multiple decimals in same number
    if (value === "." && hasDecimalInCurrentNumber()) return;

    // Handle leading zero properly
    if (display.value === "0" && value !== ".") {
        display.value = value;
    } else {
        display.value += value;
    }

    justCalculated = false;
}

// Check if current number has decimal
function hasDecimalInCurrentNumber() {
    let parts = display.value.split(/[\+\-\*\/%]/);
    let currentNumber = parts[parts.length - 1];
    return currentNumber.includes(".");
}

// Toggle sign of last number
function toggleSign() {

    playClick();  // ← play sound

    if (display.value === "0" || display.value === "Error") return;

    let exp = display.value;

    // Single number
    if (!/[+\-*/%]/.test(exp.slice(1))) {
        display.value = exp.startsWith("-") ? exp.slice(1) : "-" + exp;
        return;
    }

    // Last number in expression
    let parts = exp.split(/([\+\-*/])/);
    let last = parts.pop();

    if (last === "") { // ends with operator
        parts.push(last);
        return;
    }

    last = last.startsWith("-") ? last.slice(1) : "-" + last;
    parts.push(last);
    display.value = parts.join("");
}

// Clear display
function clearDisplay() {
    playClick();  // ← play sound
    haptic("medium"); // ← haptic feedback

    display.value = "0";
    justCalculated = false;
}

// Delete last character
function deleteLast() {

    playClick();  // ← play sound
    haptic("medium"); // ← haptic feedback

    if (display.value === "Error") return;

    display.value = display.value.slice(0, -1);
    if (display.value === "") display.value = "0";

    justCalculated = false;
}

// Calculate expression
function calculate() {

    playClick();  // ← play sound
    haptic("heavy"); // ← haptic feedback

    try {
        let expression = display.value;
        const originalExpression = display.value;


        // Convert % to decimal
        expression = expression.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

        // Solve brackets
        expression = solveBrackets(expression);

        let result = calculateExpression(expression);

        if (result === "Error" || isNaN(result)) {
            display.value = "Error";
            display.classList.add("error");
            setTimeout(() => display.classList.remove("error"), 400);
        } else {
            display.value = Number(result.toFixed(8));
            addToHistory(originalExpression, display.value);
        }

        // Glow effect
        display.classList.add("result");
        setTimeout(() => display.classList.remove("result"), 300);

        justCalculated = true;
    } catch {
        display.value = "Error";
        display.classList.add("error");
        setTimeout(() => display.classList.remove("error"), 400);
        justCalculated = true;
    }
}

// Solve brackets recursively
function solveBrackets(expression) {
    while (expression.includes("(")) {
        expression = expression.replace(/\(([^()]+)\)/, (match, innerExp) => {
            return calculateExpression(innerExp);
        });
    }
    return expression;
}

// Calculate expression without eval
function calculateExpression(expression) {

    let tokens = expression.match(/\d*\.\d+|\d+|[+\-*/]/g);
    // let tokens = expression.match(/-?\d*\.\d+|-?\d+|[+\/*]/g);

    if (!tokens) return "Error";

    tokens = tokens.map(token => isNaN(token) ? token : Number(token));

    // Fix unary minus
    for (let i = 0; i < tokens.length; i++) {
        if (
            tokens[i] === "-" &&
            (i === 0 || ["+", "-", "*", "/"].includes(tokens[i - 1]))
        ) {
            tokens[i + 1] = -Number(tokens[i + 1]);
            tokens.splice(i, 1);
            i--;
        }
    }

    // Handle * and /
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === "*" || tokens[i] === "/") {

            // Division by zero
            if (tokens[i] === "/" && tokens[i + 1] === 0) return "Error";

            let result = tokens[i] === "*" ? tokens[i - 1] * tokens[i + 1] : tokens[i - 1] / tokens[i + 1];
            tokens.splice(i - 1, 3, result);
            i--;
        }
    }

    // Handle + and -
    let result = tokens[0];
    for (let i = 1; i < tokens.length; i += 2) {
        if (tokens[i] === "+") result += tokens[i + 1];
        else if (tokens[i] === "-") result -= tokens[i + 1];
    }

    return result;
}

// Keyboard support
document.addEventListener("keydown", function (event) {
    const key = event.key;

    if (!isNaN(key)) { appendValue(key); return; }
    if (operators.includes(key)) { appendValue(key); return; }
    if (key === ".") { appendValue("."); return; }
    if (key === "Enter") { event.preventDefault(); calculate(); return; }
    if (key === "Backspace") { deleteLast(); return; }
    if (key === "Escape") { clearDisplay(); return; }
});

// Haptic feedback
function haptic(type = "light") {
    if (!navigator.vibrate) return;

    switch (type) {
        case "light":
            navigator.vibrate(10);
            break;
        case "medium":
            navigator.vibrate([15, 10, 15]);
            break;
        case "heavy":
            navigator.vibrate([30, 20, 30]);
            break;
    }
}

// History functions

function addToHistory(expression, result) {
    history.unshift(`${expression} = ${result}`);

    if (history.length > 10) history.pop(); // keep last `10` entries

    renderHistory();
}

function renderHistory() {
    historyList.innerHTML = "";

    history.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item;

        li.onclick = () => {
            const expression = item.split("=")[0].trim();
            display.value = expression;
            justCalculated = false;
        };

        historyList.appendChild(li);
    });

    saveHistory();
}

function clearHistory() {
    history = [];
    localStorage.removeItem("calc-history");
    renderHistory();
}

function saveHistory() {
    localStorage.setItem("calc-history", JSON.stringify(history));
}

function loadHistory() {
    const saved = localStorage.getItem("calc-history");
    if (saved) {
        history = JSON.parse(saved);
        renderHistory();
    }
}
loadHistory();

const historyPanel = document.getElementById("historyPanel");

function toggleHistory() {
    historyPanel.classList.toggle("open");
}


