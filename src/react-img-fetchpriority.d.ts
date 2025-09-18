import 'react';

declare module 'react' {
  interface ImgHTMLAttributes<T> {
    /** HTML fetchpriority attribute for images */
    fetchPriority?: 'high' | 'low' | 'auto';
  }
}
