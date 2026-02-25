/**
 * Answer Control Dashboard Extension
 * Adds Daily Email Feedback widget to existing dashboard
 */

// Add Email Feedback Component
const EmailFeedbackWidget = () => {
    const [emails, setEmails] = React.useState([]);
    const [stats, setStats] = React.useState({ total: 0, forKyle: 0, maybe: 0, skipped: 0 });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadEmailData();
    }, []);

    const loadEmailData = () => {
        // Load from localStorage (set by Python script)
        const saved = localStorage.getItem('kyleEmailFeedback');
        if (saved) {
            const data = JSON.parse(saved);
            setEmails(data.emails || []);
            setStats(data.stats || { total: 0, forKyle: 0, maybe: 0, skipped: 0 });
        }
        setLoading(false);
    };

    const handleFeedback = (emailId, feedback) => {
        // Mark as reviewed
        const updated = emails.map(e => 
            e.id === emailId ? { ...e, userFeedback: feedback, reviewed: true } : e
        );
        setEmails(updated);
        
        // Save back to localStorage
        localStorage.setItem('kyleEmailFeedback', JSON.stringify({
            emails: updated,
            stats: stats,
            lastUpdated: new Date().toISOString()
        }));
        
        // Send to backend (via fetch or message)
        console.log(`Feedback recorded: ${emailId} = ${feedback}`);
    };

    const markAllCorrect = () => {
        const updated = emails.map(e => ({ ...e, userFeedback: 'correct', reviewed: true }));
        setEmails(updated);
        localStorage.setItem('kyleEmailFeedback', JSON.stringify({
            emails: updated,
            stats: stats,
            lastUpdated: new Date().toISOString()
        }));
    };

    if (loading) {
        return React.createElement('div', { className: 'loading' }, 'Loading feedback data...');
    }

    const pendingEmails = emails.filter(e => !e.reviewed);

    return React.createElement('div', { className: 'dashboard-widget' }, [
        // Header
        React.createElement('div', { key: 'header', className: 'widget-header' }, [
            React.createElement('h2', { key: 'title' }, '📧 Daily Email Feedback'),
            React.createElement('p', { key: 'subtitle', className: 'subtitle' }, 
                `${stats.total} emails processed • ${pendingEmails.length} need review`
            )
        ]),
        
        // Stats
        React.createElement('div', { key: 'stats', className: 'stats-row' }, [
            React.createElement('div', { key: 'total', className: 'stat-box' }, [
                React.createElement('span', { key: 'total-num', className: 'stat-number' }, stats.total),
                React.createElement('span', { key: 'total-label', className: 'stat-label' }, 'Total')
            ]),
            React.createElement('div', { key: 'action', className: 'stat-box action' }, [
                React.createElement('span', { key: 'action-num', className: 'stat-number' }, stats.forKyle),
                React.createElement('span', { key: 'action-label', className: 'stat-label' }, 'Action')
            ]),
            React.createElement('div', { key: 'skip', className: 'stat-box skip' }, [
                React.createElement('span', { key: 'skip-num', className: 'stat-number' }, stats.skipped),
                React.createElement('span', { key: 'skip-label', className: 'stat-label' }, 'Skipped')
            ])
        ]),
        
        // Pending Review List
        React.createElement('div', { key: 'review-section', className: 'review-section' }, [
            React.createElement('h3', { key: 'review-title' }, 
                `Review Skipped Items (${pendingEmails.length})`
            ),
            
            React.createElement('div', { key: 'email-list', className: 'email-list' },
                pendingEmails.length === 0 
                    ? React.createElement('p', { key: 'no-pending', className: 'no-pending' }, 
                        'All caught up! ✅'
                    )
                    : pendingEmails.slice(0, 20).map((email, idx) => 
                        React.createElement('div', { 
                            key: email.id, 
                            className: `email-item ${email.action.toLowerCase()}` 
                        }, [
                            React.createElement('div', { key: 'header', className: 'email-header' }, [
                                React.createElement('span', { key: 'subject' }, email.subject),
                                React.createElement('span', { key: 'confidence', className: 'confidence' }, 
                                    `${email.confidence}%`
                                )
                            ]),
                            React.createElement('div', { key: 'meta', className: 'email-meta' }, [
                                React.createElement('span', { key: 'time' }, email.time),
                                React.createElement('span', { key: 'category' }, email.category)
                            ]),
                            React.createElement('div', { key: 'actions', className: 'email-actions' }, [
                                React.createElement('button', { 
                                    key: 'correct',
                                    className: 'btn-feedback correct',
                                    onClick: () => handleFeedback(email.id, 'correct')
                                }, '✅'),
                                React.createElement('button', { 
                                    key: 'wrong',
                                    className: 'btn-feedback wrong',
                                    onClick: () => handleFeedback(email.id, 'wrong')
                                }, '❌'),
                                React.createElement('button', { 
                                    key: 'action',
                                    className: 'btn-feedback should-action',
                                    onClick: () => handleFeedback(email.id, 'should-be-action')
                                }, 'Should be action'
                            ])
                        ])
                    )
            ),
            
            // Batch actions
            pendingEmails.length > 0 && React.createElement('div', { key: 'batch', className: 'batch-actions' }, [
                React.createElement('button', { 
                    key: 'all-correct',
                    className: 'btn-primary',
                    onClick: markAllCorrect
                }, 'All Correct ✅'),
                React.createElement('button', { 
                    key: 'view-all',
                    className: 'btn-secondary'
                }, 'View Full Report 📋')
            ])
        ])
    ]);
};

// CSS for new widget
const addWidgetStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .dashboard-widget {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin: 16px;
        }
        .widget-header {
            margin-bottom: 16px;
        }
        .widget-header h2 {
            margin: 0 0 4px 0;
            font-size: 1.3rem;
        }
        .subtitle {
            color: #666;
            font-size: 0.9rem;
        }
        .stats-row {
            display: flex;
            gap: 12px;
            margin: 16px 0;
        }
        .stat-box {
            flex: 1;
            background: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-box.action {
            background: #d4edda;
        }
