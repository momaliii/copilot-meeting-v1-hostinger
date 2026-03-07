import React, { forwardRef } from 'react';
import type { TooltipRenderProps } from 'react-joyride';

const TourTooltip = forwardRef<HTMLDivElement, TooltipRenderProps>(function TourTooltip(props, ref) {
  const { backProps, closeProps, index, isLastStep, primaryProps, skipProps, step, tooltipProps } = props;
  const { content, hideBackButton, hideCloseButton, hideFooter, showSkipButton, title } = step;

  const { ref: tooltipRef, ...restTooltipProps } = tooltipProps;
  const mergedRef = (el: HTMLDivElement | null) => {
    (tooltipRef as React.RefCallback<HTMLElement>)?.(el);
    if (typeof ref === 'function') ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 font-sans max-w-sm relative"
      {...restTooltipProps}
      ref={mergedRef}
    >
      {!hideCloseButton && (
        <button
          type="button"
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label={closeProps['aria-label']}
          {...closeProps}
        >
          <span className="text-lg leading-none">&times;</span>
        </button>
      )}
      {title && (
        <h4 className="font-semibold text-slate-900 text-base mb-2 pr-6">{title}</h4>
      )}
      <div className="text-sm text-slate-600 mb-4">{content}</div>
      {!hideFooter && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex-shrink-0">
            {showSkipButton && !isLastStep && (
              <button
                type="button"
                className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                {...skipProps}
              >
                {skipProps.title}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!hideBackButton && index > 0 && (
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                {...backProps}
              >
                {backProps.title}
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              {...primaryProps}
            >
              {primaryProps.title}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default TourTooltip;
