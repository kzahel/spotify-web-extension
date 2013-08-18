function ExtensionConnection(port, manager) {
    this._id = manager._id_generator++;
    this.port = port;
    this.manager = manager;
    port.onMessage.addListener( this.handle_message.bind(this) )
    port.onDisconnect.addListener( manager.handle_disconnect.bind(manager) )
}
ExtensionConnection.prototype = {
    handle_message: function(msg) {
        console.log('unhandled extension connection message',msg)
    }
}


function ExtensionConnections() {
    this._id_generator = 0;
    this._connections = {}
    this._connected = 0;
    this._active_conn = null;
}

ExtensionConnections.prototype = {
    handle_connection: function(port) {
        if (port.sender && port.sender.id == chrome.app.getDetails().id) {
            console.assert(port.name);

            var portId = port.portId_;

            console.log('extension connection from', port.name)
            conn = new ExtensionConnection(port, this);

            console.assert( portId );
            console.assert( ! this._connections[portId] )

            this._connections[portId] = conn
            this._connected++;
            console.assert( Object.keys(this._connections).length == this._connected );

            if (! this._active_conn) {
                this._active_conn = conn
            }

            console.log('Total extension connections now', this._connected);
        } else {
            console.log('unrecognized connection',port);
            port.disconnect()
        }
    },
    handle_disconnect: function(port) {
        var portId = port.portId_
        console.log(port,'port disconnected', portId);
        console.assert( portId )
        console.assert(this._connections[portId])
        delete this._connections[portId]
        this._connected--;
    },
    get_active: function() {
        return this._active_conn;
    }
}