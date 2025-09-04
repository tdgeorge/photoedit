document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('word');
    const defInput = document.getElementById('definition');
    const addBtn = document.getElementById('add-btn');
    const startBtn = document.getElementById('start-btn');
    const wordList = document.getElementById('word-list');
    const inputSection = document.getElementById('input-section');
    const reviewSectionhh = document.getElementById('review-section');
    const flashcard = document.getElementById('flashcard');
    const restartBtn = document.getElementById('restart-btn');
    const toggleThemeBtn = document.getElementById('toggle-theme-btn');

    // Only Share button (remove Load from URL)
    let shareBtn = document.getElementById('share-btn');
    if (!shareBtn) {
        shareBtn = document.createElement('button');
        shareBtn.id = 'share-btn';
        shareBtn.textContent = 'Share';
        inputSection.appendChild(shareBtn);
    }

    let cards = [];
    let reviewOrder = [];
    let currentIdx = 0;
    let showingWord = true;

    function updateWordList() {
      wordList.innerHTML = '';
      cards.forEach((c, i) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';

        // Word/definition text
        const textSpan = document.createElement('span');
        textSpan.textContent = `${c.word} — ${c.definition}`;
        li.appendChild(textSpan);

        // Button container for vertical alignment
        const btnContainer = document.createElement('span');
        btnContainer.style.display = 'flex';
        btnContainer.style.flexDirection = 'column';
        btnContainer.style.gap = '2px';
        btnContainer.style.marginLeft = '10px';

        // Edit button (✏️)
        const editBtn = document.createElement('button');
        editBtn.textContent = '✏️';
        editBtn.title = 'Edit';
        editBtn.style.padding = '0.2em 0.5em';
        editBtn.style.fontSize = '1.1em';
        editBtn.onclick = () => {
          const [removed] = cards.splice(i, 1);
          updateWordList();
          wordInput.value = removed.word;
          defInput.value = removed.definition;
          wordInput.focus();
        };
        btnContainer.appendChild(editBtn);

        // Delete button (🗑️)
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑️';
        delBtn.title = 'Delete';
        delBtn.style.padding = '0.2em 0.5em';
        delBtn.style.fontSize = '1.1em';
        delBtn.onclick = () => {
          cards.splice(i, 1);
          updateWordList();
        };
        btnContainer.appendChild(delBtn);

        li.appendChild(btnContainer);
        wordList.appendChild(li);
      });
    }

    addBtn.onclick = () => {
      const word = wordInput.value.trim();
      const definition = defInput.value.trim();
      if (word && definition) {
        cards.push({ word, definition });
        wordInput.value = '';
        defInput.value = '';
        updateWordList();
        wordInput.focus();
      }
    };

    startBtn.onclick = () => {
      if (cards.length === 0) return;
      inputSection.classList.add('hidden');
      reviewSection.classList.remove('hidden');
      startReview();
    };

    function startReview() {
      reviewOrder = shuffle([...Array(cards.length).keys()]);
      currentIdx = 0;
      showingWord = true;
      showCard();
    }

    function showCard() {
      if (currentIdx >= reviewOrder.length) {
        flashcard.textContent = "Review complete!";
        flashcard.style.background = "#2ecc40";
        flashcard.style.color = "#fff";
        flashcard.onclick = null;
        return;
      }
      const idx = reviewOrder[currentIdx];
      flashcard.textContent = cards[idx].word;
      flashcard.style.background = "";
      flashcard.style.color = "";
      showingWord = true;
      flashcard.onclick = () => {
        if (showingWord) {
          flashcard.textContent = cards[idx].definition;
          flashcard.style.background = "#ffe3e3";
          flashcard.style.color = "#181c20";
          showingWord = false;
        } else {
          currentIdx++;
          showCard();
        }
      };
    }

    restartBtn.onclick = () => {
      inputSection.classList.remove('hidden');
      reviewSection.classList.add('hidden');
    };

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // --- Serialization/Deserialization ---

    function escapeText(str) {
        return str.replace(/([|~\\])/g, '\\$1');
    }
    function unescapeText(str) {
        return str.replace(/\\([|~\\])/g, '$1');
    }

    function serialize(cards) {
        return cards.map(card =>
            `${escapeText(card.word)}~${escapeText(card.definition)}`
        ).join('|');
    }

    function deserialize(str) {
        if (!str) return [];
        let result = [];
        let pair = '';
        let inEscape = false;
        let items = [];
        for (let i = 0; i < str.length; i++) {
            let c = str[i];
            if (inEscape) {
                pair += c;
                inEscape = false;
            } else if (c === '\\') {
                inEscape = true;
            } else if (c === '|') {
                items.push(pair);
                pair = '';
            } else {
                pair += c;
            }
        }
        if (pair) items.push(pair);
        for (let item of items) {
            let parts = [];
            let part = '';
            inEscape = false;
            for (let i = 0; i < item.length; i++) {
                let c = item[i];
                if (inEscape) {
                    part += c;
                    inEscape = false;
                } else if (c === '\\') {
                    inEscape = true;
                } else if (c === '~') {
                    parts.push(part);
                    part = '';
                } else {
                    part += c;
                }
            }
            parts.push(part);
            if (parts.length === 2) {
                result.push({ word: parts[0], definition: parts[1] });
            }
        }
        return result;
    }

    // --- Share functionality with compression/obfuscation ---

    shareBtn.onclick = () => {
        const data = serialize(cards);
        const compressed = LZString.compressToBase64(data);
        const url = `${location.origin}${location.pathname}#data=${encodeURIComponent(compressed)}`;
        prompt('Share this URL:', url);
    };

    // Auto-load if URL has data
    if (location.hash.startsWith('#data=')) {
        const compressed = decodeURIComponent(location.hash.slice(6));
        const data = LZString.decompressFromBase64(compressed);
        cards = deserialize(data);
        updateWordList();
    }

    // --- Theme toggle ---
    function setTheme(theme) {
      document.body.classList.toggle('light', theme === 'light');
      toggleThemeBtn.textContent = theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode';
      localStorage.setItem('theme', theme);
    }
    toggleThemeBtn.onclick = () => {
      const isLight = document.body.classList.toggle('light');
      setTheme(isLight ? 'light' : 'dark');
    };
    if (localStorage.getItem('theme') === 'light') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
});