function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getInitials };
}
