var hfxUtil = {
    date: function(el) {
        return moment(el.innerText.trim()).format('YYYY-MM-DD');
    },
    currency: function(el,useData) {
        return parseFloat(el[useData?'data':'innerText'].trim().replace(/[^0-9-\.]/g,''));
    },
    text: function(el) {
        return el.innerText.trim();
    }
};