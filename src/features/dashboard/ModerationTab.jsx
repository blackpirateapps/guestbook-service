export default function ModerationTab({
  commentSections,
  selectedSectionId, setSelectedSectionId,
  allComments,
  allCommentsBusy,
  replyingToComment, setReplyingToComment,
  commentReplyMsg,   setCommentReplyMsg,
  approveComment,
  deleteComment,
  sendCommentReply,
  fetchComments,
}) {
  return (
    <div className="panel-card">
      <h3>Comment Moderation</h3>

      <div className="form-group">
        <label htmlFor="mod-select-section">Select Section</label>
        <select
          id="mod-select-section"
          value={selectedSectionId}
          onChange={(e) => setSelectedSectionId(e.target.value)}
        >
          <option value="">Choose a section...</option>
          {commentSections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.comment_count || 0})
            </option>
          ))}
        </select>
      </div>

      {selectedSectionId && (
        <>
          <div className="actions-row" style={{ marginTop: 0, marginBottom: "1rem" }}>
            <button
              className="secondary"
              onClick={() => fetchComments(selectedSectionId)}
              disabled={allCommentsBusy}
            >
              Refresh
            </button>
          </div>

          {allCommentsBusy ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: "80px", borderRadius: "8px" }} />
              ))}
            </div>
          ) : allComments.length === 0 ? (
            <p className="text-muted">No comments in this section.</p>
          ) : (
            <div className="entries-list">
              {allComments.map((comment) => (
                <CommentCard
                  key={comment.id}
                  comment={comment}
                  replyingToComment={replyingToComment}
                  setReplyingToComment={setReplyingToComment}
                  commentReplyMsg={commentReplyMsg}
                  setCommentReplyMsg={setCommentReplyMsg}
                  approveComment={approveComment}
                  deleteComment={deleteComment}
                  sendCommentReply={sendCommentReply}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  replyingToComment,
  setReplyingToComment,
  commentReplyMsg,
  setCommentReplyMsg,
  approveComment,
  deleteComment,
  sendCommentReply,
}) {
  const isReplying = replyingToComment === comment.id;

  return (
    <div
      className="entry-card"
      style={{ marginLeft: comment.parent_id ? "2rem" : 0 }}
    >
      <header className="entry-card-header">
        <div className="entry-title-row">
          <div className="entry-name">
            {comment.sender_name || "Anonymous"}
            <span className="badge-group">
              {comment.status === "pending" && <span className="badge pending">Pending</span>}
              {comment.is_owner === 1 && <span className="badge owner">Owner</span>}
            </span>
          </div>
          <div className="entry-date">{new Date(comment.created_at).toLocaleString()}</div>
        </div>
        <div className="entry-metrics">♥ {comment.likes || 0}</div>
      </header>

      {comment.page_url && (
        <div style={{ padding: "4px 16px 0", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          From:{" "}
          <a href={comment.page_url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>
            {comment.page_url}
          </a>
        </div>
      )}

      <div className="entry-content">{comment.comment_text}</div>

      <div className="entry-actions">
        {comment.status === "pending" && (
          <button onClick={() => approveComment(comment.id)}>✓ Approve</button>
        )}
        <button className="secondary" onClick={() => setReplyingToComment(comment.id)}>
          ↩ Reply
        </button>
        <button className="danger" onClick={() => deleteComment(comment.id)}>
          Delete
        </button>
      </div>

      {isReplying && (
        <div className="reply-box">
          <textarea
            rows={2}
            value={commentReplyMsg}
            onChange={(e) => setCommentReplyMsg(e.target.value)}
            placeholder="Write a reply..."
          />
          <div className="actions-row">
            <button onClick={() => sendCommentReply(comment.id)}>Send</button>
            <button className="secondary" onClick={() => setReplyingToComment(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
