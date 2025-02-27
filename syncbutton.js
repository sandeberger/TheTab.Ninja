class DropdownMenu {
    constructor(container, options = {}) {
      this.container = container;
      this.options = options;
      this.items = [];
      this.activeItem = null;
      this.createElements();
    }
    
    createElements() {
      // Huvudbehållare med position: relative
      this.wrapper = document.createElement('div');
      this.wrapper.classList.add('dropdown-container');
      
      // Skapa knappen (använder id #syncButton från den givna CSS:n)
      this.button = document.createElement('button');
      this.button.id = "syncButton";
      this.button.title = "Sync your collections with GitHub";
      this.button.innerHTML = `
        <svg fill="currentColor" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.91,15.51H15.38a1,1,0,0,0,0,2h2.4A8,8,0,0,1,4,12a1,1,0,0,0-2,0,10,10,0,0,0,16.88,7.23V21a1,1,0,0,0,2,0V16.5A1,1,0,0,0,19.91,15.51Z M12,2A10,10,0,0,0,5.12,4.77V3a1,1,0,0,0-2,0V7.5a1,1,0,0,0,1,1h4.5a1,1,0,0,0,0-2H6.22A8,8,0,0,1,20,12a1,1,0,0,0,2,0A10,10,0,0,0,12,2Z"></path>
        </svg>`;
      this.button.addEventListener('click', (e) => {
        if (this.options.onButtonClick) {
          this.options.onButtonClick(e);
        }
      });
      this.wrapper.appendChild(this.button);
      
      // Skapa dropdown-menyn
      this.dropdownMenu = document.createElement('div');
      this.dropdownMenu.classList.add('dropdown-menu');
      this.wrapper.appendChild(this.dropdownMenu);
      
      this.container.appendChild(this.wrapper);
      
      // Rendera menyn initialt
      this.renderMenu();
    }
    
    renderMenu() {
      this.dropdownMenu.innerHTML = '';
      // Rendera varje objekt i listan
      this.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('dropdown-item');
        if (this.activeItem && this.activeItem.guid === item.guid) {
          itemDiv.classList.add('active');
        }
        itemDiv.textContent = item.name;
        itemDiv.addEventListener('click', (e) => {
          // Undvik att trigga klickhändelsen om en ikon klickas
          if (e.target.classList.contains('edit-icon') || e.target.classList.contains('delete-icon')) return;
          this.setActiveItem(item.guid);
          if (this.options.onSelect) {
            this.options.onSelect(item);
          }
        });
        
        // Redigeringsikon
        const editIcon = document.createElement('span');
        editIcon.classList.add('edit-icon');
        editIcon.textContent = '✏️';
        editIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          const newName = prompt("Enter new name of page:", item.name);
          if (newName && newName.trim() !== "") {
            item.name = newName.trim();
            this.renderMenu();
            if (this.options.onEdit) {
              this.options.onEdit(item);
            }
          }
        });
        
        // Raderingsikon
        const deleteIcon = document.createElement('span');
        deleteIcon.classList.add('delete-icon');
        deleteIcon.textContent = '🗑️';
        deleteIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          // Förhindra borttagning av sista sidan
          if (this.items.length <= 1) {
            alert("Cannot delete the last page. At least one page must exist.");
            return;
          }
          
          if (confirm(`Are you sure you want to delete the page "${item.name}"?`)) {
            this.deleteItem(item.guid);
            if (this.options.onDelete) {
              this.options.onDelete(item);
            }
          }
        });
        
        itemDiv.appendChild(editIcon);
        itemDiv.appendChild(deleteIcon);
        this.dropdownMenu.appendChild(itemDiv);
      });
      
      // Lägg till "+"-objektet för att skapa nya objekt
      const addDiv = document.createElement('div');
      addDiv.classList.add('dropdown-add');
      addDiv.textContent = '+ Add new page';
      addDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = prompt("Enter name for new page:");
        if (name && name.trim() !== "") {
          this.addItem(name.trim());
        }
      });
      this.dropdownMenu.appendChild(addDiv);
    }
    
    addItem(name) {
      const newItem = {
        guid: this.generateGUID(),
        name: name,
        lastModified: Date.now()
      };
      this.items.push(newItem);
      if (!this.activeItem) {
        this.activeItem = newItem;
      }
      this.renderMenu();
      if (this.options.onCreate) {
        this.options.onCreate(newItem);
      }
      return newItem;
    }
    
    deleteItem(guid) {
      const itemToDelete = this.items.find(item => item.guid === guid);
      if (!itemToDelete) return;
      
      // Ta bort från listan
      this.items = this.items.filter(item => item.guid !== guid);
      
      // Om den aktiva sidan togs bort, välj den första i listan som ny aktiv
      if (this.activeItem && this.activeItem.guid === guid) {
        this.activeItem = this.items.length > 0 ? this.items[0] : null;
      }
      
      this.renderMenu();
      return itemToDelete;
    }
    
    setActiveItem(guid) {
      const item = this.items.find(i => i.guid === guid);
      if (item) {
        this.activeItem = item;
        this.renderMenu();
        return item;
      }
      return null;
    }
    
    getActiveItem() {
      return this.activeItem;
    }
    
    setItems(items) {
      this.items = items;
      if (items.length > 0 && !this.activeItem) {
        this.activeItem = items[0];
      } else if (items.length > 0) {
        // Kontrollera att den aktiva sidan fortfarande finns i listan
        const activeExists = items.some(item => item.guid === this.activeItem.guid);
        if (!activeExists) {
          this.activeItem = items[0];
        }
      } else {
        this.activeItem = null;
      }
      this.renderMenu();
    }
    
    generateGUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  }