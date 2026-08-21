const Zone = {
  Header: ({ children }) => <header className="wq-header">{children}</header>,
  /* home marks the one stage without the session's 94 px word-centering
     offset: that offset exists for the session's reserved slots, and on the
     home screen it only pushed the level card toward the action rail. */
  /* tabIndex 0: on a landscape phone the stage's content outgrows the short
     viewport and main becomes the scrollable region, and a scrollable region
     a keyboard cannot reach cannot be scrolled by one (axe
     scrollable-region-focusable, serious - found 254 times over by the first
     post-cutover census, one finding echoed by every landscape cell). On the
     tall screens it is a harmless extra tab stop before the buttons. */
  Stage: ({ children, scroll, home }) => (
    <main tabIndex={0} className={"wq-stage" + (scroll ? " wq-scroll" : "") + (home ? " wq-stage-home" : "")}>{children}</main>
  ),
  Rail: ({ children }) => <div className="wq-rail">{children}</div>,
  Strip: ({ children }) => <div className="wq-strip">{children}</div>,
};

export default Zone;
