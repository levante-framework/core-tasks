// add an item to a list in the store, creating it if necessary
export const addItemToSortedStoreList = (tag, entry) => {
    if (!store.session.has(tag)) {
      console.warn("uninitialized store tag:" + tag);
    } else {
      // read existing list
      let sortedList = store.session(tag);
  
      let index = 0;
      while (index < sortedList.length && entry >= sortedList[index]) {
        index++;
      }
  
      // Use the splice method to insert the entry at the appropriate position
      sortedList.splice(index, 0, entry);
      store.session.set(tag, sortedList);
    }
  };