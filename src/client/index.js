const ValidatorContainer = require('../validator_container');
const DefaultValidator = require('../validator/default');
const Client = require('@qtk/schema-tcp-framework').Client;
const genuuid = require('uuid/v4');
const BusinessError = require('../error/business');
const ValidationError = require('../error/validation');

module.exports = class {
    constructor({host, port, schemaDir, Validator = DefaultValidator}) {
        this._client = new Client({
            host, 
            port, 
            validator: new ValidatorContainer(schemaDir, ValidatorContainer.Type.CLIENT, Validator)
        });
        this._pendings = new Map();
        this._now = 0;
        this._client.on("data", ({uuid, data:{success, payload, error}}) => {
            const callback = this._pendings.get(uuid);
            if (callback !== undefined) {
                this._pendings.delete(uuid);
                if (success) {
                    callback.success(payload);
                }
                else {
                    switch (error.type) {
                        case 'business':
                            callback.failure(new BusinessError(error.code, error.message));
                        case 'validator':
                            callback.failure(new ValidationError(error.message));
                        default:
                            callback.failure(new Error(error.message));
                    }
                }  
            }
        });
        this._client.on("exception", (err) => {
            for (const callback of this._pendings.values()) {
                callback.failure(err);
            }
            this._pendings.clear();
        });

        setInterval(() => {
            this._now += 1;
            for (const uuid of this._pendings.keys()) {
                const callback = this._pendings.get(uuid);
                if (callback.expireTime <= this._now) {
                    this._pendings.delete(uuid);
                    callback.failure(new Error('request timeout'));
                }
            }
        }, 1000);
    }

    send({command, payload, timeout = 30, clientId = ''}) {
        return new Promise((resolve, reject) => {
            const uuid = genuuid().replace(/-/g, '');
            this._pendings.set(uuid, {
                success: (response) => resolve(response),
                failure: error => reject(error),
                expireTime: this._now + timeout
            });
            this._client.send({uuid, data:{command, payload, clientId}});
        });
    }

    async close() {
        const sleep = () => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {resolve()}, 1000);
            });
        }
        while(this._pendings.size > 0) {
            await sleep();
        }
        this._client.close();
    }
}