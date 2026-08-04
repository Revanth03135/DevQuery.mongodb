import { forwardRef } from 'react';
import { formatResultValue } from '../utils/schemaUtils';

/**
 * Chat Main Component
 * Displays chat messages and input form for database assistant
 */
const ChatMain = forwardRef(({
    messages,
    chatInput,
    assistantLoading,
    onInputChange,
    onSendChat
}, ref) => {
    return (
        <div className="chat-main fullscreen">
            <div className="chat-messages-main" ref={ref}>
                {messages.map((msg, idx) => {
                    const key = `${msg.timestamp || idx}-${idx}`;
                    const typeClass = msg.type ? ` ${msg.type}` : '';

                    // Handle results type for inline display
                    if (msg.type === 'results') {
                        try {
                            const data = JSON.parse(msg.text);
                            const cols = data.columns || [];
                            const rows = data.rows || [];

                            return (
                                <div key={key} className={`chat-msg ${msg.sender}${typeClass}`}>
                                    <div className="chat-results-table">
                                        {cols.length > 0 ? (
                                            <table>
                                                <thead>
                                                    <tr>
                                                        {cols.map((col) => (
                                                            <th key={col}>{col}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.length > 0 ? (
                                                        rows.map((row, rowIdx) => (
                                                            <tr key={rowIdx}>
                                                                {cols.map((col) => (
                                                                    <td key={col}>{formatResultValue(row?.[col])}</td>
                                                                ))}
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={cols.length}>No rows returned.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p>No results available.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        } catch (e) {
                            return (
                                <div key={key} className={`chat-msg ${msg.sender}${typeClass}`}>
                                    <span>{msg.text}</span>
                                </div>
                            );
                        }
                    }

                    return (
                        <div key={key} className={`chat-msg ${msg.sender}${typeClass}`}>
                            {msg.type === 'sql' ? <pre>{msg.text}</pre> : <span>{msg.text}</span>}
                        </div>
                    );
                })}
                {assistantLoading && (
                    <div className="chat-msg bot chat-typing">
                        <span>Thinking</span>
                        <div className="typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
            </div>
            <form className="chat-footer-main" onSubmit={onSendChat} autoComplete="off">
                <input
                    id="mainChatInput"
                    type="text"
                    className="chat-input-main"
                    placeholder="Ask about your data..."
                    value={chatInput}
                    onChange={e => onInputChange(e.target.value)}
                    autoFocus
                    disabled={assistantLoading}
                />
                <button type="submit" className="btn btn-primary chat-send-main" disabled={!chatInput.trim() || assistantLoading}>
                    <i className="fas fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
});

ChatMain.displayName = 'ChatMain';

export default ChatMain;
