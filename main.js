import './style.css'
import './editor.css'
import Alpine from 'alpinejs'
import initialData from './data.json'

window.Alpine = Alpine

const editorTemplate = `
  <div class="content-area" :class="{ 'editor-open': isEditorOpen }">
    <slot></slot>
  </div>

  <div class="editor-sidebar" :class="{ 'open': isEditorOpen }">
    <div class="editor-header">
      <h2 x-text="currentSection ? 'Edit ' + currentSection : 'Select a section'"></h2>
      <button @click="closeEditor" class="close-btn">&times;</button>
    </div>

    <div class="editor-content" x-show="currentSection">
      <div class="dynamic-inputs">
        <template x-for="(field, path) in getFieldPaths()" :key="path">
          <div class="input-group">
            <div class="input-group-header">
              <label x-text="formatLabel(path)"></label>
              <template x-if="Array.isArray(getValueByPath(path))">
                <button @click="addArrayItemToStart(path)" class="small-btn">Add to Start</button>
              </template>
            </div>
            
            <template x-if="Array.isArray(getValueByPath(path))">
              <div class="array-controls">
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
                            <img :src="value" alt="">
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
                <div class="array-footer">
                  <button @click="addArrayItemToEnd(path)" class="small-btn">Add to End</button>
                </div>
              </div>
            </template>

            <template x-if="typeof getValueByPath(path) === 'string' && path.endsWith('image')">
              <div class="image-input">
                <label>
                  Browse
                  <input type="file" @change="handleImageUpload($event, path)" accept="image/*">
                </label>
                <img :src="getValueByPath(path)" alt="">
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
`

// Initialize the editor
document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector('#app')
  if (!app) return

  // Create a wrapper div with Alpine data binding
  const wrapper = document.createElement('div')
  wrapper.setAttribute('x-data', 'editor')
  
  // Store the original content
  const originalContent = app.innerHTML
  
  // Set the wrapper's HTML to include both the editor template and original content
  wrapper.innerHTML = editorTemplate
  
  // Find the slot element and replace it with the original content
  const slot = wrapper.querySelector('slot')
  if (slot) {
    slot.outerHTML = originalContent
  }
  
  // Replace the app div's content with the wrapper
  app.innerHTML = ''
  app.appendChild(wrapper)
})

Alpine.directive('edit', (el, { expression }) => {
  el.addEventListener('click', (event) => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return
    }
    
    document.querySelectorAll('[x-edit]').forEach(section => {
      section.classList.remove('active')
    })
    
    el.classList.add('active')
    
    const component = Alpine.$data(el.closest('[x-data]'))
    
    component.openEditor(expression, event)
  })
})

Alpine.data('editor', () => ({
  content: structuredClone(initialData),
  isEditorOpen: false,
  currentSection: null,

  init() {
    const savedContent = localStorage.getItem('pageContent')
    if (savedContent) {
      this.content = JSON.parse(savedContent)
    }
  },

  openEditor(section, event) {
    this.currentSection = section
    this.isEditorOpen = true
  },

  closeEditor() {
    this.isEditorOpen = false
    document.querySelectorAll('[x-edit]').forEach(section => {
      section.classList.remove('active')
    })
    setTimeout(() => {
      this.currentSection = null
    }, 300)
  },

  saveContent() {
    localStorage.setItem('pageContent', JSON.stringify(this.content))
    console.log('Saved content:', this.content)
    this.closeEditor()
  },

  formatLabel(path) {
    const label = path.split('.').pop()
    return label
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  },

  getFieldPaths(obj = this.content[this.currentSection], prefix = this.currentSection) {
    const paths = {}
    
    const traverse = (obj, path) => {
      if (Array.isArray(obj)) {
        paths[path] = obj
        return
      }
      
      if (typeof obj === 'object' && obj !== null) {
        Object.entries(obj).forEach(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key
          if (typeof value === 'string') {
            paths[newPath] = value
          } else if (Array.isArray(value)) {
            paths[newPath] = value
          } else if (typeof value === 'object' && value !== null) {
            traverse(value, newPath)
          }
        })
      } else if (typeof obj === 'string') {
        paths[path] = obj
      }
    }

    traverse(obj, prefix)
    return paths
  },

  getValueByPath(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.content)
  },

  setValueByPath(path, value) {
    const keys = path.split('.')
    const lastKey = keys.pop()
    const obj = keys.reduce((obj, key) => obj[key], this.content)
    if (obj) {
      obj[lastKey] = value
    }
    return obj?.[lastKey] || ''
  },

  createEmptyItem(array) {
    const template = {}
    if (array && array.length > 0) {
      Object.keys(array[0]).forEach(key => {
        template[key] = ''
      })
    }
    return template
  },

  addArrayItemToStart(path) {
    const array = this.getValueByPath(path)
    if (array) {
      const emptyItem = this.createEmptyItem(array)
      array.unshift(emptyItem)
    }
  },

  addArrayItemToEnd(path) {
    const array = this.getValueByPath(path)
    if (array) {
      const emptyItem = this.createEmptyItem(array)
      array.push(emptyItem)
    }
  },

  moveArrayItem(path, fromIndex, toIndex) {
    const array = this.getValueByPath(path)
    if (array && toIndex >= 0 && toIndex < array.length) {
      const items = document.querySelectorAll('.array-item')
      const movingUp = toIndex < fromIndex
      
      items[fromIndex].classList.add(movingUp ? 'moving-up' : 'moving-down')
      items[toIndex].classList.add(movingUp ? 'moving-down' : 'moving-up')
      
      setTimeout(() => {
        const item = array.splice(fromIndex, 1)[0]
        array.splice(toIndex, 0, item)
        
        items[fromIndex].classList.remove(movingUp ? 'moving-up' : 'moving-down')
        items[toIndex].classList.remove(movingUp ? 'moving-down' : 'moving-up')
      }, 600)
    }
  },

  removeArrayItem(path, index) {
    const array = this.getValueByPath(path)
    if (array && array.length > 1) {
      array.splice(index, 1)
    }
  },

  async handleImageUpload(event, path) {
    const file = event.target.files[0]
    if (!file) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const ratio = img.width / img.height
      const newWidth = 750
      const newHeight = newWidth / ratio

      canvas.width = newWidth
      canvas.height = newHeight

      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      const resizedImage = canvas.toDataURL(file.type)
      this.setValueByPath(path, resizedImage)
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  }
}))

Alpine.start()