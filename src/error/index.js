module.exports = class WebError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}