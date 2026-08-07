const Zone = {
  Header: ({ children }) => <header className="wq-header">{children}</header>,
  /* home marks the one stage without the session's 94 px word-centering
     offset: that offset exists for the session's reserved slots, and on the
     home screen it only pushed the level card toward the action rail. */
  Stage: ({ children, scroll, home }) => (
    <main className={"wq-stage" + (scroll ? " wq-scroll" : "") + (home ? " wq-stage-home" : "")}>{children}</main>
  ),
  Rail: ({ children }) => <div className="wq-rail">{children}</div>,
  Strip: ({ children }) => <div className="wq-strip">{children}</div>,
};

export default Zone;
