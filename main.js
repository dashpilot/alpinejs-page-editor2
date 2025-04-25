import './editor.css';
import Alpine from 'alpinejs';

window.Alpine = Alpine;

// Default configuration
window.cfg = window.cfg || {};
window.cfg.data_url = window.cfg.data_url || '/data.json';

const editorTemplate = `
  <div class="content-area" :class="{ 'editor-open': isEditorOpen }">
    <slot></slot>
  </div>

  <div class="editor-sidebar" :class="{ 'open': isEditorOpen }">
    <div class="editor-header">
      <h2 x-text="currentSection ? 'Edit ' + currentSection : 'Select a section'"></h2>
      <button @click="closeEditor" class="close-btn"></button>
    </div>

    <div class="editor-content" x-show="currentSection">
      <div class="dynamic-inputs">
        <template x-for="(field, path) in getFieldPaths()" :key="path">
          <div class="input-group">
            <div class="input-group-header">
              <label x-text="formatLabel(path)"></label>
              <template x-if="Array.isArray(getValueByPath(path))">
                <button @click="addArrayItemToStart(path)" class="editor-btn">Add to Start</button>
              </template>
            </div>
            
            <template x-if="Array.isArray(getValueByPath(path))">
              <div class="array-controls">
                <template x-if="getValueByPath(path).length > 0 && typeof getValueByPath(path)[0] === 'string'">
                  <template x-for="(item, index) in getValueByPath(path)" :key="index">
                    <div class="array-item">
                      <div class="array-item-header">
                        <h4 x-text="'Item ' + (index + 1)"></h4>
                        <div class="array-item-actions">
                          <button 
                            @click="moveArrayItem(path, index, index - 1)" 
                            class="small-btn"
                            :disabled="index === 0"
                          >↑</button>
                          <button 
                            @click="moveArrayItem(path, index, index + 1)" 
                            class="small-btn"
                            :disabled="index === getValueByPath(path).length - 1"
                          >↓</button>
                          <button 
                            @click="removeArrayItem(path, index)" 
                            class="small-btn delete"
                            :disabled="getValueByPath(path).length <= 1"
                          >×</button>
                        </div>
                      </div>
                      <input 
                        type="text" 
                        :value="item"
                        @input="getValueByPath(path)[index] = $event.target.value"
                      >
                    </div>
                  </template>
                </template>
                <template x-if="!(getValueByPath(path).length > 0 && typeof getValueByPath(path)[0] === 'string')">
                  <template x-for="(item, index) in getValueByPath(path)" :key="index">
                    <div class="array-item">
                      <div class="array-item-header">
                        <h4 x-text="'Item ' + (index + 1)"></h4>
                        <div class="array-item-actions">
                          <button 
                            @click="moveArrayItem(path, index, index - 1)" 
                            class="small-btn"
                            :disabled="index === 0"
                          >↑</button>
                          <button 
                            @click="moveArrayItem(path, index, index + 1)" 
                            class="small-btn"
                            :disabled="index === getValueByPath(path).length - 1"
                          >↓</button>
                          <button 
                            @click="removeArrayItem(path, index)" 
                            class="small-btn delete"
                            :disabled="getValueByPath(path).length <= 1"
                          >×</button>
                        </div>
                      </div>
                      <template x-for="(value, key) in item" :key="key">
                        <div class="input-group">
                          <label x-text="formatLabel(key)"></label>
                          <template x-if="key === 'image'">
                            <div class="image-input">
                              <label>
                                Browse
                                <input type="file" @change="handleImageUpload($event, path + '.' + index + '.' + key)" accept="image/*">
                              </label>
                              <template x-if="value">
                                <div>
                                  <img :src="value" alt="">
                                </div>
                              </template>
                            </div>
                          </template>
                          <template x-if="key !== 'image'">
                            <input 
                              type="text" 
                              :value="value"
                              @input="item[key] = $event.target.value"
                            >
                          </template>
                        </div>
                      </template>
                    </div>
                  </template>
                </template>
                <div class="array-footer">
                  <button @click="addArrayItemToEnd(path)" class="editor-btn">Add to End</button>
                </div>
              </div>
            </template>

            <template x-if="typeof getValueByPath(path) === 'string' && path.endsWith('image')">
              <div class="image-input">
                <label>
                  Browse
                  <input type="file" @change="handleImageUpload($event, path)" accept="image/*">
                </label>
                <template x-if="getValueByPath(path)">
                  <div>
                    <img :src="getValueByPath(path)" alt="">
                  </div>
                </template>
              </div>
            </template>

            <template x-if="typeof getValueByPath(path) === 'string' && !path.endsWith('image') && getValueByPath(path).length > 50">
              <textarea 
                :value="getValueByPath(path)"
                @input="setValueByPath(path, $event.target.value)"
                rows="4"
                spellcheck="false"
              ></textarea>
            </template>

            <template x-if="typeof getValueByPath(path) === 'string' && !path.endsWith('image') && getValueByPath(path).length <= 50">
              <input 
                type="text" 
                :value="getValueByPath(path)"
                @input="setValueByPath(path, $event.target.value)"
              >
            </template>
          </div>
        </template>
      </div>
    </div>

    <div class="editor-footer" x-show="currentSection">
      <button @click="saveContent">Save</button>
    </div>
  </div>
`;

// Initialize the editor
document.addEventListener('DOMContentLoaded', () => {
	const app = document.querySelector('#app');
	if (!app) return;

	// Create a wrapper div with Alpine data binding
	const wrapper = document.createElement('div');
	wrapper.setAttribute('x-data', 'editor');

	// Store the original content
	const originalContent = app.innerHTML;

	// Set the wrapper's HTML to include both the editor template and original content
	wrapper.innerHTML = editorTemplate;

	// Find the slot element and replace it with the original content
	const slot = wrapper.querySelector('slot');
	if (slot) {
		slot.outerHTML = originalContent;
	}

	// Replace the app div's content with the wrapper
	app.innerHTML = '';
	app.appendChild(wrapper);
});

Alpine.directive('edit', (el, { expression }) => {
	el.addEventListener('click', (event) => {
		// Don't open editor if clicking on interactive elements
		if (
			event.target.tagName === 'INPUT' ||
			event.target.tagName === 'TEXTAREA' ||
			event.target.tagName === 'A' ||
			event.target.tagName === 'BUTTON' ||
			event.target.closest('a') ||
			event.target.closest('button')
		) {
			return;
		}

		document.querySelectorAll('[x-edit]').forEach((section) => {
			section.classList.remove('active');
		});

		el.classList.add('active');

		const component = Alpine.$data(el.closest('[x-data]'));

		component.openEditor(expression, event);
	});
});

Alpine.data('editor', () => ({
	data: {},
	isEditorOpen: false,
	currentSection: null,

	init() {
		// Fetch initial data from configured URL
		fetch(window.cfg.data_url)
			.then((response) => response.json())
			.then((data) => {
				this.data = structuredClone(data);

				// Only load from localStorage if enabled
				if (window.cfg.local_storage !== false) {
					const savedContent = localStorage.getItem('pageContent');
					if (savedContent) {
						this.data = JSON.parse(savedContent);
					}
				}

				console.log(this.data);
			});
	},

	openEditor(section, event) {
		this.currentSection = section;
		this.isEditorOpen = true;
	},

	closeEditor() {
		this.isEditorOpen = false;
		document.querySelectorAll('[x-edit]').forEach((section) => {
			section.classList.remove('active');
		});
		setTimeout(() => {
			this.currentSection = null;
		}, 300);
	},

	saveContent() {
		// Save to localStorage if enabled
		if (window.cfg.local_storage !== false) {
			localStorage.setItem('pageContent', JSON.stringify(this.data));
			console.log('Saved content to localStorage:', this.data);
		}

		// If save_url is configured, send data to endpoint
		if (window.cfg.save_url) {
			fetch(window.cfg.save_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					data: this.data,
					template: window.cfg.template || null
				})
			})
				.then((response) => {
					if (!response.ok) {
						throw new Error('Network response was not ok');
					}
					console.log('Data saved to server successfully');
				})
				.catch((error) => {
					console.error('Error saving to server:', error);
				});
		}

		this.closeEditor();
	},

	formatLabel(path) {
		const label = path.split('.').pop();
		return label
			.replace(/_/g, ' ') // Replace underscores with spaces
			.replace(/([A-Z])/g, ' $1') // Add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
			.trim();
	},

	getFieldPaths(obj = this.data[this.currentSection], prefix = this.currentSection) {
		const paths = {};

		const traverse = (obj, path) => {
			if (Array.isArray(obj)) {
				// If it's an array of strings, treat it as a single field
				if (obj.length > 0 && typeof obj[0] === 'string') {
					paths[path] = obj;
				} else {
					paths[path] = obj;
				}
				return;
			}

			if (typeof obj === 'object' && obj !== null) {
				Object.entries(obj).forEach(([key, value]) => {
					// Skip keys with the name 'id'
					if (key === 'id') return;

					const newPath = path ? `${path}.${key}` : key;
					if (typeof value === 'string') {
						paths[newPath] = value;
					} else if (Array.isArray(value)) {
						paths[newPath] = value;
					} else if (typeof value === 'object' && value !== null) {
						traverse(value, newPath);
					}
				});
			} else if (typeof obj === 'string') {
				paths[path] = obj;
			}
		};

		traverse(obj, prefix);
		return paths;
	},

	getValueByPath(path) {
		return path.split('.').reduce((obj, key) => obj?.[key], this.data);
	},

	setValueByPath(path, value) {
		const keys = path.split('.');
		const lastKey = keys.pop();
		const obj = keys.reduce((obj, key) => obj[key], this.data);
		if (obj) {
			obj[lastKey] = value;
		}
		return obj?.[lastKey] || '';
	},

	createEmptyItem(array) {
		// If it's an array of strings, return an empty string
		if (array && array.length > 0 && typeof array[0] === 'string') {
			return '';
		}
		// Otherwise create an empty object with the same structure
		const template = {};
		if (array && array.length > 0) {
			Object.keys(array[0]).forEach((key) => {
				template[key] = '';
			});
		}
		return template;
	},

	addArrayItemToStart(path) {
		const array = this.getValueByPath(path);
		if (array) {
			const emptyItem = this.createEmptyItem(array);
			array.unshift(emptyItem);
		}
	},

	addArrayItemToEnd(path) {
		const array = this.getValueByPath(path);
		if (array) {
			const emptyItem = this.createEmptyItem(array);
			array.push(emptyItem);
		}
	},

	moveArrayItem(path, fromIndex, toIndex) {
		const array = this.getValueByPath(path);
		if (array && toIndex >= 0 && toIndex < array.length) {
			const items = document.querySelectorAll('.array-item');
			const movingUp = toIndex < fromIndex;

			items[fromIndex].classList.add(movingUp ? 'moving-up' : 'moving-down');
			items[toIndex].classList.add(movingUp ? 'moving-down' : 'moving-up');

			setTimeout(() => {
				const item = array.splice(fromIndex, 1)[0];
				array.splice(toIndex, 0, item);

				items[fromIndex].classList.remove(movingUp ? 'moving-up' : 'moving-down');
				items[toIndex].classList.remove(movingUp ? 'moving-down' : 'moving-up');
			}, 600);
		}
	},

	removeArrayItem(path, index) {
		const array = this.getValueByPath(path);
		if (array && array.length > 1) {
			array.splice(index, 1);
		}
	},

	async handleImageUpload(event, path) {
		const file = event.target.files[0];
		if (!file) return;

		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = new Image();

		img.onload = () => {
			const ratio = img.width / img.height;
			const newWidth = 750;
			const newHeight = newWidth / ratio;

			canvas.width = newWidth;
			canvas.height = newHeight;

			ctx.drawImage(img, 0, 0, newWidth, newHeight);

			const resizedImage = canvas.toDataURL(file.type);
			this.setValueByPath(path, resizedImage);
		};

		const reader = new FileReader();
		reader.onload = (e) => {
			img.src = e.target.result;
		};
		reader.readAsDataURL(file);
	}
}));

Alpine.start();
