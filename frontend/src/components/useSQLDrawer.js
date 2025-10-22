import { useReducer, useEffect, useRef, useCallback } from 'react';

const initialState = {
  showSQLDrawer: false,
  dragEnabled: false,
  isDragging: false,
  isResizing: false,
  isFullscreen: false,
  drawerPos: { right: 0, top: 0 },
  drawerSize: { width: 480, height: window.innerHeight },
};

const drawerReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE_DRAWER':
      return { ...state, showSQLDrawer: !state.showSQLDrawer };
    case 'OPEN_DRAWER':
      return { ...state, showSQLDrawer: true };
    case 'CLOSE_DRAWER':
      return { ...state, showSQLDrawer: false, isFullscreen: false, dragEnabled: false };
    case 'TOGGLE_DRAG_ENABLED':
      return { ...state, dragEnabled: !state.dragEnabled };
    case 'SET_DRAGGING':
      return { ...state, isDragging: action.payload };
    case 'SET_RESIZING':
      return { ...state, isResizing: action.payload };
    case 'TOGGLE_FULLSCREEN':
      return { ...state, isFullscreen: !state.isFullscreen, dragEnabled: action.payload ? false : state.dragEnabled };
    case 'SET_DRAWER_POS':
      return { ...state, drawerPos: action.payload };
    case 'SET_DRAWER_SIZE':
      return { ...state, drawerSize: action.payload };
    case 'RESET_DRAWER_SIZE_ON_RESIZE':
      return {
        ...state,
        drawerSize: { ...state.drawerSize, height: window.innerHeight },
        drawerPos: { ...state.drawerPos, top: Math.min(state.drawerPos.top, Math.max(0, window.innerHeight - 120)) }
      };
    default:
      return state;
  }
};

const useSQLDrawer = () => {
  const [state, dispatch] = useReducer(drawerReducer, initialState);
  const dragRef = useRef({ startX: 0, startY: 0, startRight: 0, startTop: 0, startWidth: 0, startHeight: 0 });

  const onPointerMove = useCallback((e) => {
    if (state.isDragging) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newRight = Math.max(0, dragRef.current.startRight - dx);
      const newTop = Math.max(0, dragRef.current.startTop + dy);
      dispatch({ type: 'SET_DRAWER_POS', payload: { right: newRight, top: Math.min(Math.max(newTop, 0), window.innerHeight - 120) } });
    }
    if (state.isResizing) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const newWidth = Math.max(300, dragRef.current.startWidth - dx);
      const newHeight = Math.max(200, dragRef.current.startHeight + dy);
      dispatch({ type: 'SET_DRAWER_SIZE', payload: { width: Math.min(newWidth, window.innerWidth - 100), height: Math.min(newHeight, window.innerHeight - 40) } });
    }
  }, [state.isDragging, state.isResizing]);

  const onPointerUp = useCallback(() => {
    if (state.isDragging) dispatch({ type: 'SET_DRAGGING', payload: false });
    if (state.isResizing) dispatch({ type: 'SET_RESIZING', payload: false });
  }, [state.isDragging, state.isResizing]);

  useEffect(() => {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    const onResize = () => dispatch({ type: 'RESET_DRAWER_SIZE_ON_RESIZE' });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
    };
  }, [onPointerMove, onPointerUp]);

  return { ...state, dispatch, dragRef };
};

export default useSQLDrawer;