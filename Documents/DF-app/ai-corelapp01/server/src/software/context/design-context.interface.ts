/**
 * Interface voor design context informatie
 */
export interface DesignContext {
  /**
   * Unieke identifier voor de context
   */
  id?: string;

  /**
   * Naam van het platform (bijv. coreldraw, blender)
   */
  platform: string;

  /**
   * Naam van het huidige document
   */
  documentName?: string;

  /**
   * Eigenschappen van het document
   */
  documentProperties?: {
    name: string;
    size?: {
      width: number;
      height: number;
    };
    units?: string;
    colorMode?: string;
  };

  /**
   * Lijst van elementen in het document
   */
  elements: DesignElement[];

  /**
   * Momenteel geselecteerde element(en)
   */
  activeSelection?: DesignElement | DesignElement[];

  /**
   * Geschiedenis van uitgevoerde acties
   */
  actionHistory?: {
    type: string;
    description: string;
    parameters?: Record<string, any>;
    timestamp: number;
    success: boolean;
  }[];

  /**
   * Statistieken over het document
   */
  statistics?: {
    elementCount: number;
    elementTypeDistribution: Record<string, number>;
    colorUsage: Record<string, number>;
    elementBySize?: {
      largest: DesignElement;
      smallest: DesignElement;
    };
  };

  /**
   * Viewport en camera instellingen
   */
  viewportSettings?: {
    zoom: number;
    centerPoint?: {
      x: number;
      y: number;
      z?: number;
    };
    cameraPosition?: {
      x: number;
      y: number;
      z: number;
    };
  };
}

/**
 * Interface voor design elementen
 */
export interface DesignElement {
  /**
   * Unieke identifier van het element
   */
  id: string;

  /**
   * Type van het element
   */
  type: string;

  /**
   * Naam van het element
   */
  name?: string;

  /**
   * Positie van het element
   */
  position: {
    x: number;
    y: number;
    z?: number;
  };

  /**
   * Afmeting van het element
   */
  size: {
    width: number;
    height: number;
    depth?: number;
  };

  /**
   * Rotatie van het element
   */
  rotation?: {
    x?: number;
    y?: number;
    z?: number;
    angle?: number;
  };

  /**
   * Stijl eigenschappen van het element
   */
  style?: {
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
    opacity?: number;
    fontSize?: number;
    fontName?: string;
    textContent?: string;
  };

  /**
   * Groepsinformatie
   */
  groupId?: string;

  /**
   * Padsegmenten voor vectorelementen
   */
  pathSegments?: Array<{
    type: 'line' | 'curve' | 'arc';
    points: Array<{ x: number; y: number; z?: number }>;
  }>;

  /**
   * Materiaalinformatie voor 3D-elementen
   */
  material?: {
    name?: string;
    color?: string;
    metallic?: number;
    roughness?: number;
    texturePath?: string;
  };

  /**
   * Verborgen status van het element
   */
  hidden?: boolean;

  /**
   * Vergrendeld status van het element
   */
  locked?: boolean;

  /**
   * Extra eigenschappen afhankelijk van elementtype
   */
  properties?: Record<string, any>;
} 